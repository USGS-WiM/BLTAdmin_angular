bltApp.controller('LoginController', function ($scope, LoginService, AuthService, $location, $rootScope) {

    $scope.hideHeader = true;
    $scope.credentials = {};
    $scope.error = "";
    //login
    $scope.login = function () {

        if (!$scope.credentials.username || !$scope.credentials.password) {
            $scope.error = "Please enter username and password";
            return;
        }
        $scope.showLoading = true;
        //check if it's a guest user
        var password = $scope.credentials.password;
        if (password.substring(0, 4) == "AbEv") {
            //parse it apart to get the event and the pula, and then go ahead and validateUser, then pass
            var indexOfend = password.indexOf("$");
            var x = indexOfend == 4 ? 1 : indexOfend - 4; //eventId is only 1 digit
            $scope.credentials.eventId = password.substring(4, x + 4);
            //This will be 'BLTDefau1t'
            $scope.credentials.password = password.substring(password.indexOf("$") + 1, password.indexOf("$") + 11);
            AuthService.setCredentials($scope.credentials);
        } else {
            AuthService.setCredentials($scope.credentials);
        }
        LoginService.login({},
            function success(response) {
                var user = response;
                if (user != undefined) {
                    $scope.credentials.roleId = response.role_id;
                    $scope.credentials.name = response.fname + " " + response.lname;
                    AuthService.setCredentials($scope.credentials);
                    //send user to the home page
                    //after a successful login
                    $rootScope.$broadcast('userLoggedIn');
                    $location.path("/home");
                    $scope.showLoading = false;
                } else {
                    $scope.showLoading = false;
                }
            },
            function error(errorResponse) {
                $scope.showLoading = false;
                //remove credentials
                AuthService.removeCredentials();
                $scope.error = "We couldn't log you in. Please try again.";
            });

    }

});

bltApp.controller('HomeController', function ($scope, $location, AuthService, leafletData, $modal, PULAService, limitToFilter, UserService, EventService, ProductService, PULAPOIService, VersionService, SpeciesService, LimitationsService, EventPULAService, AIService, PartsService, $q, AuthService, RoleService) {
    //guest
    //get event id
    if (AuthService.getEventId()) {
        $scope.isGuest = true;
        $scope.eventId = AuthService.getEventId();
        $scope.hideFilters = true;
        $scope.hideMenu = true;
    } else {
        RoleService.getAll({}, function (roles) {
            //get user role
            $scope.role = roles[AuthService.getRoleId()];
            $scope.isAdmin = $scope.role.role_name == config.ADMIN_ROLE ? true : false;
        });
    }
    $scope.noPULAs = false;
    $scope.filteredPULAs = {};
    //$scope.showPULALoading = true;
    $scope.filter = {};
    $scope.filter.event = "All";

    $scope.mapperLimits = [];
    $scope.mapLayers = {
        pending: true,
        created: true,
        published: true,
        effective: true,
        expired: true
    }

    //setup leaflet map
    angular.extend($scope, {
        center: config.map.center,
        layers: {
            baselayers: {
                topo: config.map.topo
            }
        }
    });


    // initialize the address search bar
    var searchControl = L.esri.Geocoding.Controls.geosearch(config.map.geosearch);
    var results = L.layerGroup();

    // listen for the results event and add every result to the map
    searchControl.on("results", function (data) {
        results.clearLayers();
        for (var i = data.results.length - 1; i >= 0; i--) {
            results.addLayer(L.marker(data.results[i].latlng));
        };
    });

    //initialize the map
    var formatDate = moment().format("YYYY-MM-DD");
    var monthYear = moment().format("YYYY-MM");
    leafletData.getMap("map").then(
        function (map) {
            var pula = L.esri.dynamicMapLayer({
                url: config.BLTMapServerURL,
                opacity: 0.5,
                layers: [0, 1, 2, 3, 4],
                visible: true,
                tolerence: 4,
                width: map._size.x,
                height: map._size.y,
                returnGeometry: true

            }).addTo(map);
            $scope.pula = pula;
            //add the address seach bar
            searchControl.addTo(map);
            // create an empty layer group to store the results and add it to the map
            results.addTo(map);

            map.on('click', function (e) {
                //show loading indicator
                $scope.showPULALoading = true;
                //create a list of the pulas that are currently visible
                var visibleLayers = $scope.pula.getLayers();
                var filteredPULAs = $scope.filteredPULAs;
                var pulas = [];
                for (var i = 0; i < visibleLayers.length; i++) {
                    if (filteredPULAs[visibleLayers[i]]) {
                        pulas = pulas.concat(filteredPULAs[visibleLayers[i]]);
                    }
                }
                $scope.pula.identify().on(map).at(e.latlng).layers('top').run(function (error, featureCollection) {

                    if ($scope.identifiedFeature) {
                        map.removeLayer($scope.identifiedFeature);
                    }

                    //Find the feature that is currently visible
                    //This is needed as leaflet doesn't return just the visible pulas
                    var features = featureCollection.features;
                    var feature, shapeId, f;
                    var layer;
                    var properties = {};
                    var visibleFeatureList = [];

                    for (var i = 0; i < features.length; i++) {
                        f = features[i];
                        shapeId = parseInt(f.properties.PULASHAPEI);
                        if (_.contains(pulas, shapeId)) {
                            visibleFeatureList.push(f);
                        }
                    }

                    var feature = visibleFeatureList[0];
                    if (visibleFeatureList.length == 1 && feature) {
                        //highlight the pula that was clicked                        
                        $scope.identifiedFeature = new L.GeoJSON(feature, {
                            style: function () {
                                return {
                                    color: '#FFFF00',
                                    weight: 2
                                };
                            }
                        }).addTo(map);
                        //details for expired pulas are not available
                        if (feature.properties.expired_time_stamp != "Null") {
                            $scope.expiredPULA = true;
                            $scope.pulaDetails = null;
                            $scope.mPulaDetails = null;
                            $scope.showPULALoading = false;
                        } else {
                            $scope.expiredPULA = false;
                            getPULADetails(feature.properties.PULASHAPEI);
                        }
                    } else {
                        $scope.pulaDetails = null;
                        $scope.mPulaDetails = null;
                        $scope.showPULALoading = false;
                        $scope.expiredPULA = false;
                    }
                    $scope.multiplePULAs = visibleFeatureList.length > 1 ? true : false;
                });
            });

            $scope.filterShapes();

        }
    );

    var getLayerDefs = function () {
        if (!$scope.isGuest) {
            return {
                0: "PULA_SHAPE_ID IS NULL",
                1: "created_time_stamp <= timestamp '" + formatDate + "' AND (published_time_stamp IS NULL AND expired_time_stamp IS NULL)",
                2: "published_time_stamp <= timestamp '" + formatDate + "' AND ((effective_date > timestamp '" + formatDate + "') OR (effective_date IS NULL)) AND expired_time_stamp IS NULL",
                3: "effective_date <= timestamp '" + formatDate + "' AND published_time_stamp <= timestamp '" + formatDate + "' AND ((expired_time_stamp >= timestamp '" + monthYear + "') OR (expired_time_stamp IS NULL))",
                4: "(expired_time_stamp <= timestamp '" + monthYear + "')"

            }
        } else {
            return {
                0: "1=0",
                1: "1=0",
                2: "1=0",
                3: "1=0",
                4: "1=0"
            }
        }
    }

    //get species, active ingredients, crop uses, application methods , formulations and limitation codes
    var initialize = function () {
        $scope.selected = {};
        $scope.effectiveYears = getYearRange(6);
        var species = SpeciesService.getAll();
        var aiList = AIService.get();
        var cropUseList = PartsService.getAll({
            url: config.parts.db["CROP USE"].url
        });
        var applicationMethodList = PartsService.getAll({
            url: config.parts.db["APPLICATION METHOD"].url
        });
        var formulationList = PartsService.getAll({
            url: config.parts.db["FORMULATION"].url
        });
        var limitationCodeList = PartsService.getAll({
            url: config.parts.db["LIMITATION"].url
        });
        var eventList = EventService.get({});
        $scope.showPULALoading = true;
        $q.all([species, aiList, cropUseList, applicationMethodList, formulationList, limitationCodeList, eventList]).then(function (results) {
            $scope.species = results[0].data.SPECIES;
            $scope.aiList = _.indexBy(results[1].data, "active_ingredient_id");
            $scope.cropUseList = _.indexBy(results[2], "crop_use_id");
            $scope.applicationMethodList = _.indexBy(results[3], "application_method_id");
            $scope.formulationList = _.indexBy(results[4], "formulation_id");
            $scope.limitationCodeList = _.indexBy(results[5], "limitation_id");
            $scope.events = _.indexBy(results[6], "event_id");

            //need arrays for ui dropdowns
            $scope.ui = {};
            $scope.ui.aiList = results[1].data;
            $scope.ui.cropUseList = results[2];
            $scope.ui.applicationMethodList = results[3];
            $scope.ui.formulationList = results[4];
            $scope.ui.limitationCodeList = results[5];
            $scope.ui.events = results[6];

            $scope.showPULALoading = false;
        });

        $scope.justificationTypes = config.justificationTypes;
    }

    initialize();

    //get limitations
    var getPULADetails = function (mapShapeId) {

        $scope.pulaDetails = null;
        //show loading indicator
        $scope.showPULALoading = true;
        $scope.noAccess = false;
        var pulaDetails = $scope.pulaList[mapShapeId];
        var pulaId = pulaDetails ? pulaDetails.pula_id : null;

        //get the effective date, comments, event, entity id
        if (pulaId != null) {
            var date = $scope.seclectedDate;
            date.month = $scope.months.indexOf($scope.date.month) + 1;
            PULAPOIService.get(mapShapeId, date).success(function (response) {
                $scope.pulaDetails = response;
                $scope.pulaDetails.data = {};
                if (response && response != "") {
                    //effective date
                    $scope.pulaDetails.data.effectiveDateStr = response.effective_date ? moment(response.effective_date).format("MM/DD/YYYY") : "";
                    //comments
                    var commentList = [];
                    if (response.comments) {
                        var comments = response.comments.split("]");
                        var commentSections;
                        comments.forEach(function (comment) {
                            comment = comment.replace("[", "");
                            if (comment && comment != "") {
                                commentSections = comment.split("|");
                                commentList.push({
                                    name: commentSections[0],
                                    org: commentSections[1],
                                    text: commentSections[2]
                                });
                            }
                        });
                    }
                    $scope.pulaDetails.data.comments = commentList;

                    //event
                    var eventID = response.event_id;
                    $scope.pulaDetails.data.event = $scope.events[eventID];


                    //justification information
                    for (var header in config.justificationTypes) {
                        var items = config.justificationTypes[header].items;
                        for (var item in items) {
                            var type = items[item].value;
                            if (response[type]) {
                                $scope.pulaDetails[type] = response[type];
                                $scope.pulaDetails.data.justificationType = type;
                                $scope.pulaDetails.data.justificationLabel = config.justificationTypes[header].name + ", " + items[item].name
                            }
                        }
                    }

                    //version
                    var versionId = response.version_id;
                    VersionService.get(versionId).success(function (response) {
                        var version = response;
                        $scope.pulaDetails.data.version = version;
                        $scope.pulaDetails.data.creationDate = version.created_time_stamp ? moment(version.created_time_stamp).format("MM/DD/YYYY") : "";
                        $scope.pulaDetails.data.publishedDate = version.published_time_stamp ? moment(version.published_time_stamp).format("MM/DD/YYYY") : "";
                        $scope.pulaDetails.data.expirationDateStr = version.expired_time_stamp ? moment(version.expired_time_stamp).format("MM/DD/YYYY") : "";
                        //get users
                        if ($scope.isAdmin) {
                            //creator
                            if (version.creator_id) {
                                UserService.query({
                                    id: version.creator_id
                                }, function (response) {
                                    var creator = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.data.creator = creator.fname + " " + creator.lname;
                                });
                            }
                            //publisher
                            if (version.publisher_id) {
                                UserService.query({
                                    id: version.publisher_id
                                }, function (response) {
                                    var publisher = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.data.publisher = publisher.fname + " " + publisher.lname;
                                });
                            }
                            //expirer
                            if (version.expirer_id) {
                                UserService.query({
                                    id: version.expirer_id
                                }, function (response) {
                                    var expirer = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.data.expirer = expirer.fname + " " + expirer.lname;
                                });
                            }
                        }
                    });

                    //get the species
                    ///ActiveIngredientPULA/{activeIngredientPULAID}/Species
                    $scope.pulaDetails.data.speciesList = [];

                    SpeciesService.get($scope.pulaDetails)
                        .success(function (response) {
                            $scope.pulaDetails.data.speciesList = response.SPECIES;
                        });

                    //get the limitations

                    LimitationsService.get(pulaId, $scope.seclectedDate, function (response) {
                        $scope.pulaDetails.data.mapperLimits = response;

                        //set limitation's extra information
                        var limitaitons = response;
                        var limit;
                        for (var i = 0; i < limitaitons.length; i++) {
                            limit = limitaitons[i];
                            //name
                            if (limit.active_ingredient_id) {
                                limit.NAME = $scope.aiList[limit.active_ingredient_id]["ingredient_name"];
                            } else if (limit.product_id) {
                                limit.NAME = limit.product_name + " [" + limit.product_registration_number + "]";
                            }
                            //application method
                            limit.APPMETHOD = $scope.applicationMethodList[limit.application_method_id]["method"];
                            //formulation
                            limit.FORM = $scope.formulationList[limit.formulation_id]["form"];
                            //crop use
                            limit.USE = $scope.cropUseList[limit.crop_use_id]["use"];
                            //limiations code
                            limit.CODE = $scope.limitationCodeList[limit.limitation_id]["code"];
                            //limiations
                            limit.LIMITATION = $scope.limitationCodeList[limit.limitation_id]["limitation1"];


                        }

                        if ($scope.isGuest) {
                            //limitation codes
                            LimitationsService.getCodes(response, $scope.seclectedDate, function (response) {
                                $scope.limitationCodes = response;
                                $scope.pulaSectionUrl = "templates/pula/pula-details.cshtml";
                                $scope.showPULALoading = false;
                            });
                        } else {
                            $scope.pulaSectionUrl = "templates/pula/pula-details.cshtml";
                            $scope.showPULALoading = false;
                        }
                    });
                }

            });

        } else {

            //set shapeid from the map
            $scope.pulaDetails = {
                data: {
                    mapShapeId: mapShapeId
                }
            };
            if ($scope.isAdmin) {
                $scope.newPULA();
            } else {
                $scope.noAccess = true;
                $scope.showPULALoading = false;
                $scope.pulaSectionUrl = "";
            }
        }

    }

    //filter layers
    $scope.filterLayers = function () {
        leafletData.getMap("map").then(
            function (map) {
                var filteredLayers = [];
                var mapLayers = $scope.mapLayers;
                if (mapLayers.pending) {
                    filteredLayers.push(0);
                }
                if (mapLayers.created) {
                    filteredLayers.push(1);
                }
                if (mapLayers.published) {
                    filteredLayers.push(2);
                }
                if (mapLayers.effective) {
                    filteredLayers.push(3);
                }
                if (mapLayers.expired) {
                    filteredLayers.push(4);
                }
                $scope.pula.setLayers(filteredLayers);
            });
    }

    //Product filter
    $scope.productSearchResults = {};
    $scope.getProducts = function (term) {
        $scope.productSearchResults = {};
        if (term.length < 3) {
            return [];
        } else {
            var date = moment().format("DD/MM/YYYY");
            return ProductService.get(date, term).then(function (response) {
                return response.data.map(function (item) {
                    $scope.productSearchResults[item.product_name] = item;
                    return item;
                });
            });
        }
    };

    //Date Filter
    $scope.date = {};
    $scope.filter = {};
    $scope.seclectedDate = {};
    $scope.filter.showDatePicker = false;
    var currentDate = new Date();
    $scope.months = moment.months();
    $scope.years = getYearRange(6);


    $scope.setDateToToday = function () {
        $scope.seclectedDate.month = moment().format("MMMM");
        var year = moment().format("YYYY");
        $scope.seclectedDate.year = parseInt(year);
    }

    $scope.setDateToSelected = function () {
        $scope.date.month = $scope.seclectedDate.month;
        $scope.date.year = $scope.seclectedDate.year;
        $scope.filter.showDatePicker = false;
    }

    $scope.setDateToToday();
    $scope.setDateToSelected();

    $scope.refreshMap = function () {
        $scope.noPULAs = false;
        $scope.filter.event = "All";
        $scope.filter.ai = "";
        $scope.filter.product = "";
        $scope.filterShapes();
    }

    $scope.filterShapes = function (isFilter) {

        if (isFilter) {
            $scope.pulaDetails = null;
        }
        $scope.noPULAs = false;
        $scope.showLoading = true;
        //1. get date, active ingredient, event and product
        var event = $scope.filter.event;
        var ai = $scope.filter.ai;
        var product = $scope.filter.product;
        var filter = {
            eventID: (event && event != "All") ? event : "-1",
            productID: product ? parseInt(product.product_id) : "-1",
            aiID: ai ? parseInt(ai) : "-1"
        };

        //determine date
        if (isFilter) {
            //use the date set that is set in the filter unless it's the current month and year
            var currentDate = moment();
            if (currentDate.format("MMMM") == $scope.date.month && currentDate.year() == $scope.date.year) {
                //include the day if it's the current month and year
                filter.date = moment().format("MM/DD/YYYY");
            } else {
                filter.date = $scope.months.indexOf($scope.date.month) + 1 + "/01/" + $scope.date.year;
            }
        } else {
            filter.date = moment().format("MM/DD/YYYY");
        }

        //if guest, filter by event
        if ($scope.isGuest) {
            isFilter = true;
            filter.eventID = $scope.eventId;
        }

        PULAService.get(filter, function (response) {
            var pendingPulaShapes = [];
            var createdPulaShapes = [];
            var publishedPulaShapes = [];
            var effectivePulaShapes = [];
            var expiredPulaShapes = [];
            var pulaList = response;
            var pula, effectiveDate, expiredDate, shapeId, createdDate, publishDate, eventID;
            var limitations, match;
            var chosenDate = filter.date;
            if (pulaList.length == 0) {
                $scope.showLoading = false;
                $scope.noPULAs = true;
            }
            for (var i = 0; i < pulaList.length; i++) {
                pula = pulaList[i];
                effectiveDate = pula.effective_date;
                expiredDate = pula.expired_time_stamp;
                createdDate = pula.created_time_stamp;
                publishDate = pula.published_time_stamp;
                shapeID = pula.pula_shape_id;
                eventID = pula.event_id;
                limitations = pula.limitations;

                if (isFilter) {
                    //filter by event
                    if (filter.eventID != -1) {
                        if (eventID != filter.eventID) {
                            continue;
                        }
                    }
                    //filter by ai
                    if (filter.aiID != -1) {
                        match = _.find(limitations, {
                            "active_ingredient_id": filter.aiID
                        });
                        if (!match) {
                            continue;
                        }
                    }
                    //filter by product
                    if (filter.productID != -1) {
                        match = _.find(limitations, {
                            "product_id": filter.productID
                        });
                        if (!match) {
                            continue;
                        }
                    }
                }

                if (!$scope.isGuest) {
                    //pending if there is no Shape Id associated with the pula               
                    if (!shapeID) {
                        pendingPulaShapes.push(pula.PULASHAPEI);
                        continue;
                    }
                }

                //created if (created is <= chosen date AND (published is null OR published is null expired)
                if ((!createdDate || moment(createdDate).isSameOrBefore(chosenDate)) && (publishDate == null && expiredDate == null)) {
                    createdPulaShapes.push(pula.PULASHAPEI);
                }
                //show only the created PULAs when a guest is logged in
                if (!$scope.isGuest) {

                    //published if (effective is null OR after chosenDate) AND (expired is null or after chosendate)
                    if ((moment(publishDate).isSameOrBefore(chosenDate)) && (effectiveDate == null || moment(effectiveDate).isAfter(chosenDate)) && (expiredDate == null)) {
                        publishedPulaShapes.push(pula.PULASHAPEI);
                    }
                    //effective if (effective is <= chosen date AND (expired is null OR after chosenDate)
                    if ((moment(effectiveDate).isSameOrBefore(chosenDate)) && (moment(publishDate).isSameOrBefore(chosenDate)) && (expiredDate == null || moment(expiredDate).isSameOrAfter(chosenDate))) {
                        effectivePulaShapes.push(pula.PULASHAPEI);
                    }
                    //ExpiredList.PULA = PULAlist.PULA.Where(x => (x.Expired.HasValue && x.Expired.Value <= chosenDate)).ToList();
                    if (moment(expiredDate).isSameOrBefore(chosenDate)) {
                        expiredPulaShapes.push(pula.PULASHAPEI);
                    }
                }
            }

            var layers = {
                0: pendingPulaShapes.length == 0 ? "1=0" : "PULASHAPEI = " + pendingPulaShapes.join(" or PULASHAPEI = "),
                1: createdPulaShapes.length == 0 ? "1=0" : "PULASHAPEI = " + createdPulaShapes.join(" or PULASHAPEI = "),
                2: publishedPulaShapes.length == 0 ? "1=0" : "PULASHAPEI = " + publishedPulaShapes.join(" or PULASHAPEI = "),
                3: effectivePulaShapes.length == 0 ? "1=0" : "PULASHAPEI = " + effectivePulaShapes.join(" or PULASHAPEI = "),
                4: expiredPulaShapes.length == 0 ? "1=0" : "PULASHAPEI = " + expiredPulaShapes.join(" or PULASHAPEI = ")
            };
            //maintain a list of PULAs that are visible on the map
            $scope.filteredPULAs = {
                0: pendingPulaShapes,
                1: createdPulaShapes,
                2: publishedPulaShapes,
                3: effectivePulaShapes,
                4: expiredPulaShapes
            };
            if (pendingPulaShapes.length == 0 && createdPulaShapes.length == 0 && publishedPulaShapes.length == 0 && effectivePulaShapes.length == 0 && expiredPulaShapes.length == 0) {
                $scope.noPULAs = true;
            }
            $scope.pula.setLayerDefs(layers);
            $scope.pulaList = _.indexBy(pulaList, "PULASHAPEI");
            $scope.showLoading = false;
        });
    }

    //export comments
    $scope.exportCommentsAsCSV = function () {
        var date = moment().format("MM-DD-YYYY");
        var fileName = "PULAComments_" + date + ".csv";

        //generate content
        var csv = "Contributor Comments\n";
        csv = csv + "Name,Organization,Comment\n";
        var comments = $scope.pulaDetails.data.comments;
        comments.forEach(function (comment) {
            csv = csv + comment.name + "," + comment.org + "," + comment.text + "\n";
        });

        //create csv
        var link = document.createElement('a');
        link.href = 'data:attachment/csv,' + encodeURIComponent(csv);
        link.target = '_blank';
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
    }

    //generate contributor password
    $scope.showContributorPassword = function () {
        var contributor = {};
        //login
        contributor.login = "guest";
        //generate password
        var n = 4;
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < n; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        contributor.password = "AbEv" + $scope.pulaDetails.event_id + "$BLTDef@u1t" + text;
        $scope.contributor = contributor;
        $scope.contributorModalInstance = $modal.open({
            scope: $scope,
            animation: true,
            size: 'md',
            templateUrl: 'contributorPassword.cshtml'
        });

    }

    $scope.closeContributorPasswordModal = function () {
        $scope.contributorModalInstance.dismiss('cancel');
    }

    //expire pulas
    $scope.expirationYears = getYears(5);
    $scope.addExpirationDate = function (pula, date, callback) {
        PULAPOIService.updateStatus(pula.id, date, "Expired").success(function () {
            pula.data.expirationDateStr = date.month + "/01/" + date.year;
            if (callback) {
                callback();
            } else {
                //refresh map
                $scope.refreshMap();
                //show message
                $scope.pulaDetails.data.message = "Expiration date has been added";
            }
        });
    }

    //add effective date
    $scope.addEffectiveDate = function () {
        var date = $scope.effectiveDate;
        date.month = $scope.months.indexOf(date.month) + 1;
        PULAPOIService.updateStatus($scope.pulaDetails.id, date, "Effective").success(function () {
            $scope.pulaDetails.data.effectiveDateStr = _.indexOf($scope.months, date.month) + 1 + "/01/" + date.year;
        });
    }


    //publish PULA
    $scope.publishPULA = function () {

        $scope.showLoading = true;
        PULAPOIService.publish($scope.pulaDetails.id).success(function (response) {
            //refresh the map
            $scope.refreshMap();

            //set it to published
            $scope.pulaDetails.is_published = 1;
            $scope.pulaDetails.data.publishedDate = moment().format("MM/DD/YYYY");
            $scope.pulaDetails.data.publisher = AuthService.getName();

            $scope.showLoading = false;
            //show message
            $scope.pulaDetails.data.message = "The PULA has been published";
        });
    }

    $scope.newPULA = function () {
        $scope.status = "new";
        $scope.showPULALoading = true;
        $scope.justificationTypes = config.justificationTypes;
        $scope.mPulaDetails = {
            data: {
                isNew: true,
                errors: [],
                mapperLimits: [],
                species: [],
                speciesList: [],
                creationDate: moment().format("MM/DD/YYYY"),
                mapShapeId: $scope.pulaDetails.data.mapShapeId
            }
        };

        //get the user
        UserService.query({
            username: AuthService.getUsername()
        }, function (response) {
            var creator = response.length == 1 ? response[0] : response;
            $scope.mPulaDetails.data.creator = creator.fname + " " + creator.lname;
            $scope.pulaSectionUrl = "templates/pula/edit-pula.cshtml";
            $scope.showPULALoading = false;
        });
    }

    //edit PULA
    $scope.editPULA = function () {
        //initialize
        $scope.showPULALoading = true;
        $scope.status = "edit";
        $scope.mPulaDetails = angular.copy($scope.pulaDetails);
        //effective date
        if ($scope.pulaDetails.data.effectiveDateStr) {
            var effectiveDate = new moment($scope.pulaDetails.data.effectiveDateStr);
            $scope.mPulaDetails.data.effectiveDate = {};
            $scope.mPulaDetails.data.effectiveDate.month = effectiveDate.month() + 1;
            $scope.mPulaDetails.data.effectiveDate.year = effectiveDate.year();
        }
        //expiration date
        if ($scope.pulaDetails.data.expirationDateStr) {
            var expirationDate = new moment($scope.pulaDetails.data.expirationDateStr);
            $scope.mPulaDetails.data.expirationDate = {};
            $scope.mPulaDetails.data.expirationDate.month = expirationDate.month() + 1;
            $scope.mPulaDetails.data.expirationDate.year = expirationDate.year();
        }

        //number of limitations
        $scope.mPulaDetails.data.numLimits = $scope.mPulaDetails.data.mapperLimits ? $scope.mPulaDetails.data.mapperLimits.length : 0;
        //number of species
        $scope.mPulaDetails.data.numSpecies = $scope.mPulaDetails.data.speciesList ? $scope.mPulaDetails.data.speciesList.length : 0;
        //        $scope.data = {
        //            events: $scope.events
        //        };
        $scope.mPulaDetails.data.event = $scope.events[$scope.mPulaDetails.event_id];
        $scope.pulaSectionUrl = "templates/pula/edit-pula.cshtml";
        $scope.showPULALoading = false;

    }

    $scope.onEditPULALoad = function () {}

    //    $scope.setPULAEvent = function () {
    //        $scope.mPulaDetails.event = $scope.mPulaDetails.data.event;
    //    }

    $scope.setPULAEffectiveDate = function () {
        var date = $scope.mPulaDetails.data.effectiveDate;
        if (date.month && date.year) {
            $scope.mPulaDetails.effective_date = date.month + "/01/" + date.year;
        } else {
            $scope.mPulaDetails.effective_date = "";
        }
    }
    $scope.addLimitation = function () {
        $scope.errorMsg = "";
        var mapperLimitNew = {};

        //active ingredient
        var activeIngredient = $scope.mPulaDetails.data.activeIngredient;
        if (activeIngredient) {
            mapperLimitNew.NAME = activeIngredient["ingredient_name"];
            mapperLimitNew.active_ingredient_id = activeIngredient.active_ingredient_id;
        }
        //product
        var product = $scope.mPulaDetails.data.product;
        if (product) {
            mapperLimitNew.NAME = product.product_name + " [" + product.product_registration_number + "]";
            mapperLimitNew.product_id = product.product_id;
            delete mapperLimitNew.active_ingredient_id;
        }
        //crop use
        var cropUse = $scope.mPulaDetails.data.cropUse;
        mapperLimitNew.USE = cropUse.use;
        mapperLimitNew.crop_use_id = cropUse.crop_use_id;
        //application method
        var applicationMethod = $scope.mPulaDetails.data.applicationMethod;
        mapperLimitNew.APPMETHOD = applicationMethod.method;
        mapperLimitNew.application_method_id = applicationMethod.application_method_id;
        //formulation
        var formulation = $scope.mPulaDetails.data.formulation;
        mapperLimitNew.FORM = formulation.form;
        mapperLimitNew.formulation_id = formulation.formulation_id;
        //code
        var limitation = $scope.mPulaDetails.data.limitation;
        mapperLimitNew.CODE = limitation.code;
        //limitation id
        mapperLimitNew.limitation_id = limitation.limitation_id;


        //check if duplicate
        var matchIndex = -1;
        for (var i = 0; i < $scope.mPulaDetails.data.mapperLimits.length; i++) {
            limit = $scope.mPulaDetails.data.mapperLimits[i];
            if (limit.NAME == mapperLimitNew.NAME && limit.USE == mapperLimitNew.USE && limit.APPMETHOD == mapperLimitNew.APPMETHOD && limit.FORM == mapperLimitNew.FORM && limit.CODE == mapperLimitNew.CODE) {
                matchIndex = i;
                break;
            }
        };

        //no match was found
        if (matchIndex == -1) {
            mapperLimitNew.pula_id = $scope.mPulaDetails.pula_id;
            $scope.mPulaDetails.data.mapperLimits.unshift(mapperLimitNew);
            $scope.mPulaDetails.data.numLimits = $scope.mPulaDetails.data.numLimits + 1;
            mapperLimitNew.status = "new";

        } else {
            //adding back a previously deleted item
            if ($scope.mPulaDetails.data.mapperLimits[matchIndex].status == "delete") {
                delete $scope.mPulaDetails.data.mapperLimits[matchIndex].status;
                $scope.mPulaDetails.data.numLimits = $scope.mPulaDetails.data.numLimits + 1;
            } else {
                //adding a duplicate
                $scope.errorMsg = "This limitation already exists";
            }
        }

    }

    $scope.addSpecies = function () {
        var newSpecies = $scope.mPulaDetails.data.newSpecies;
        var speciesList = $scope.mPulaDetails.data.speciesList;
        var matchIndex = -1;
        if (newSpecies.status == "delete") {
            delete newSpecies.status;
        } else {
            //check for duplicate
            for (var i = 0; i < speciesList.length; i++) {
                if (speciesList[i].ENTITY_ID == newSpecies.ENTITY_ID) {
                    matchIndex = i;
                    break;
                }
            }

            //no match was found
            if (matchIndex == -1) {
                speciesList.unshift(newSpecies);
                $scope.mPulaDetails.data.numSpecies = $scope.mPulaDetails.data.numSpecies + 1;
                newSpecies.status = "new";
            } else {
                //adding back a previously deleted item
                if (speciesList.status == "delete") {
                    delete speciesList[matchIndex].status;
                    $scope.mPulaDetails.data.numSpecies = $scope.mPulaDetails.data.numSpecies + 1;
                } else {
                    //adding a duplicate
                    $scope.errorMsg = "This species already exists";
                }
            }

        }

    }

    $scope.removeSpecies = function (index) {
        var speciesList = $scope.mPulaDetails.data.speciesList;
        var species = speciesList[index];
        if (species.status == "new") {
            speciesList.splice(index, 1);
        } else {
            species.status = "delete";
        }
        $scope.mPulaDetails.data.numSpecies = $scope.mPulaDetails.data.numSpecies - 1;

    }

    $scope.cancelEditPULA = function () {
        $scope.pulaSectionUrl = "templates/pula/pula-details.cshtml";
    }

    $scope.savePULA = function () {
        $scope.showPULALoading = true;
        var data = $scope.mPulaDetails.data;
        data.errors = [];
        //save expiration date, limitations and species

        var saveLimitsAndSpecies = function (callback) {
            var pulaId = $scope.mPulaDetails.pula_id;
            //Limitations
            var limitations = data.mapperLimits;
            var limit;
            if (pulaId) {
                //add the pula id to all of the limitations
                for (var i = 0; i < limitations.length; i++) {
                    limit = limitations[i];
                    limit.pula_id = pulaId;
                };
            }
            LimitationsService.addOrRemove(limitations).then(function (results) {
                //species
                var species = data.speciesList;
                SpeciesService.addOrRemove($scope.mPulaDetails.pula_id, species).then(function (results) {
                    callback();
                });
            });
        }
        var saveAdditionalInfo = function (callback) {
            //expiration date
            var date = data.expirationDate;
            if (date && date.month && date.year) {
                $scope.addExpirationDate($scope.mPulaDetails, date, function () {
                    saveLimitsAndSpecies(callback);
                });
            } else {
                saveLimitsAndSpecies(callback);
            }
        }

        //VALIDATION
        //effective date: make sure that both month and year for effective date are chosen if either is chose
        var date = data.effectiveDate;
        if (date && (!date.month || !date.year)) {
            data.errors.push("Please choose both month and year for Effective Date in the 'General Information section'");
        }
        //expiration date
        date = data.expirationDate;
        if (date && (!date.month || !date.year)) {
            data.errors.push("Please choose both month and year for Expiration Date in the 'General Information section'");
        }

        //stop processing if there are any errors
        if (data.errors.length > 0) {
            $scope.showPULALoading = false;
            return;
        }

        //set event id
        if (data.event) {
            $scope.mPulaDetails.event_id = data.event.event_id;
        }
        //set effective date
        if (data.effectiveDate) {
            $scope.setPULAEffectiveDate();
        }

        var isNew = data.isNew;

        if (isNew) {
            //create the PULA first
            $scope.mPulaDetails.pula_shape_id = $scope.mPulaDetails.data.mapShapeId;

            PULAPOIService.post($scope.mPulaDetails).success(function (response) {
                $scope.mPulaDetails.id = response.id;
                $scope.mPulaDetails.pula_id = response.pula_id;
                $scope.mPulaDetails.pula_shape_id = response.pula_shape_id;
                $scope.mPulaDetails.version_id = response.version_id;
                $scope.pulaList[response.pula_shape_id] = response;
                saveAdditionalInfo(function () {
                    //refresh the map
                    $scope.refreshMap();
                    $scope.pulaDetails.data.message = "The PULA has been saved";
                    getPULADetails($scope.mPulaDetails.pula_shape_id);
                    $scope.showPULALoading = false;
                });
            });
        } else {
            PULAPOIService.update($scope.mPulaDetails).success(function () {
                saveAdditionalInfo(function () {
                    //refresh the map
                    $scope.refreshMap();
                    $scope.pulaDetails = angular.copy($scope.mPulaDetails);
                    $scope.pulaDetails.data.message = "The PULA has been saved";
                    $scope.pulaSectionUrl = "templates/pula/pula-details.cshtml";
                    $scope.showPULALoading = false;
                });
            });
        }


    }




    $scope.getProductList = function () {
        var activeIngredient = $scope.mPulaDetails.data.activeIngredient;
        //get products associated with the active ingredient
        AIService.getProducts(activeIngredient["active_ingredient_id"]).success(function (response) {
            $scope.productList = response;
        });
    };

    //add comment
    $scope.comment = {};
    $scope.addComment = function () {
        $scope.showLoading = true;
        PULAPOIService.addComment($scope.pulaDetails, $scope.comment).success(function () {
            $scope.showLoading = false;
            $scope.comment = {};
            $scope.isCommentSubmitted = true;
        });

    }

    $scope.removeMapperLimit = function (index) {
        var limitation = $scope.mPulaDetails.data.mapperLimits[index];
        if (limitation.status == "new") {
            $scope.mPulaDetails.data.mapperLimits.splice(index, 1);
        } else {
            limitation.status = "delete";
        }
        $scope.mPulaDetails.data.numLimits = $scope.mPulaDetails.data.numLimits - 1;
    }

});

bltApp.controller('HeaderCtrl', function ($scope, $location, AuthService, RoleService) {
    $scope.user = {};
    $scope.user.name = AuthService.getUsername();

    var initializeRole = function () {
        var roleId = AuthService.getRoleId();
        if (roleId) {

            RoleService.getAll({}, function (roles) {
                $scope.hideMenu = false;
                $scope.role = roles[roleId];
                $scope.isAdmin = $scope.role.role_name == config.ADMIN_ROLE ? true : false;

            });
        }
    }

    initializeRole();
    $scope.$on("userLoggedIn", function (event) {
        $scope.user.name = AuthService.getUsername();
        if (AuthService.getEventId()) {
            $scope.hideMenu = true;
        } else {
            initializeRole();
        }
    });

    $scope.logOff = function () {
        //remove credentials
        AuthService.removeCredentials();
        $location.path("/path");
    }
});

bltApp.controller('UserController', function ($scope, organizations, roles, users, divisions, UserService, AuthService, $modal, RoleService) {

    RoleService.getAll({}, function (roles) {
        $scope.role = roles[AuthService.getRoleId()];
    });

    $scope.data = {};
    $scope.editForm = {};
    $scope.organizations = organizations;
    $scope.roles = roles;
    $scope.users = users;
    $scope.divisions = divisions;
    $scope.action = "";
    $scope.pass = {
        newP: '',
        confirmP: ''
    };

    //password change section
    $scope.changeMyPassBtn = function (evt) {
        $scope.changePass === false ? $scope.changePass = true : $scope.changePass = false;
    };


    $scope.DontChangePass = function () {
        //nevermind,  clear input
        $scope.changePass = false;
        $scope.pass = { newP: '', confirmP: ''   };
    };

    //Add or update user
    $scope.editUser = function (index) {
        $scope.userIndex = index;
        if (index == -1) {
            $scope.user = {};
            $scope.editForm.submited = false;
            $scope.editForm.title = "Add New User";
            $scope.action = "add";            
        } else {
            var user = angular.copy($scope.users[index]);
            $scope.data.organization = $scope.organizations[user.organization_id];
            $scope.data.role = $scope.roles[user.role_id];
            $scope.data.division = $scope.divisions[user.division_id];
            $scope.user = user;
            $scope.editForm.title = "Edit User '" + user.username + "'";
            $scope.action = "edit";
            $scope.changePass = false;
        }
        $scope.modalInstance = $modal.open({
            scope: $scope,
            animation: true,
            templateUrl: 'user.cshtml'
        });
    };

    //Save user
    $scope.save = function (isValid) {
        $scope.editForm.submited = true;
        if (isValid) {
            //assign organization, roles and divisions ids
            var user = $scope.user;
            var org = $scope.data.organization;
            var role = $scope.data.role;
            var division = $scope.data.division;
            user.organization_id = org ? org.organization_id : null;
            user.role_id = role ? role.role_id : null;
            user.division_id = division ? division.division_id : null;
            user.password = $scope.pass.confirmP !== "" ? btoa($scope.pass.confirmP) : "";

            //new user
            if ($scope.userIndex == -1) {
                UserService.create(user, function () {
                    $scope.users.push(user);
                    $scope.modalInstance.dismiss('cancel');
                });
            }
            //save existing user
            else {
                $scope.user.$update({
                    id: user.user_id
                }).then(function () {
                    $scope.users[$scope.userIndex] = user;
                    $scope.modalInstance.dismiss('cancel');
                });
            }
        }

    };

    //Cancel add/update modal
    $scope.cancel = function () {
        $scope.modalInstance.dismiss('cancel');
    };

    //Show delete user modal
    $scope.deleteUser = function (index) {
        var user = angular.copy($scope.users[index]);
        $scope.userIndex = index;
        $scope.user = user;
        $scope.deleteModalInstance = $modal.open({
            scope: $scope,
            animation: true,
            size: 'sm',
            templateUrl: 'delete.cshtml'
        });


    }

    //delete user
    $scope.delete = function () {
        var index = $scope.userIndex;
        var user = $scope.users[index];

        user.$delete({
            id: user.user_id
        }).then(function () {
            $scope.users.splice(index, 1);
            $scope.cancelDelete();
        });

    }

    //cancel delete modal
    $scope.cancelDelete = function () {
        $scope.deleteModalInstance.dismiss('cancel');
    }
});

//A general controller for all of the parts 
bltApp.controller('PartsController', function ($scope, $rootScope, $modal, RoleService, AuthService, AIClassService, PartsService, ProductService, AIService) {
    RoleService.getAll({}, function (roles) {
        $scope.role = roles[AuthService.getRoleId()];
        $scope.isAdmin = $scope.role.role_name == config.ADMIN_ROLE ? true : false;
    });

    var pageSize = config.parts.pageSize;
    $scope.showLoading = true;
    $scope.config = {
        parts: config.parts.db
    };
    $scope.editForm = {};
    $scope.selectedPart = {};
    $scope.selectedPart.active = false;
    $scope.deleteMessage = "";

    //query the specific type of part and display the results
    $scope.showPart = function (name) {
        $scope.currentPage = 1;
        $scope.showLoading = true;
        $scope.search = {
            term: ""
        };
        $scope.deleteMessage = "";
        $scope.data = [];
        $scope.selectedKey = name;
        $scope.selectedPart = $scope.config.parts[name];
        $scope.selectedPart.name = name;
        if (!$scope.selectedPart.search) {
            PartsService.getAll({
                    url: $scope.selectedPart.url,
                    publishedDate: ""
                },
                function (response) {

                    $scope.parts = response;
                    $scope.showLoading = false;

                });
        } else {
            $scope.parts = [];
            $scope.showLoading = false;
        }
    }
    $scope.showPart("ACTIVE INGREDIENT");

    $scope.refresh = function () {
        $scope.showPart($scope.selectedPart.name);
    }

    //edit
    $scope.editPart = function (index, part, copy) {
        $scope.index = index;
        $scope.products = [];
        $scope.classList = {};
        $scope.product = {
            term: ""
        };
        if (index == -1) {
            if (copy) {
                $scope.part = {};
                var columns = $scope.selectedPart.edit.columns;
                var col;
                for (var i = 0; i < columns.length; i++) {
                    col = columns[i].name;
                    $scope.part[col] = part[col];
                }
            } else {
                $scope.part = {};
                $scope.classList = {};
                $scope.productList = {};
            }
            $scope.editForm.submited = false;
            $scope.editForm.title = "Add New " + $scope.selectedPart.heading;
        } else {
            var part = angular.copy(part);
            delete part.version_id; //don't send the version id
            $scope.part = part;
            $scope.editForm.title = "Edit";
            if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
                //get classes associated with the active ingredient
                AIService.getClasses(part.active_ingredient_id).success(function (response) {
                    $scope.classList = _.indexBy(response, "ai_class_name");
                });
                //get products associated with the active ingredient
                AIService.getProducts(part.active_ingredient_id).success(function (response) {
                    $scope.productList = _.indexBy(response, "product_name");
                });
            }

        }
        var templateUrl = $scope.selectedPart.name == "ACTIVE INGREDIENT" ? "parts/edit-part-ai.cshtml" : "parts/edit-part.cshtml"
        $scope.modalInstance = $modal.open({
            scope: $scope,
            animation: true,
            templateUrl: 'templates/' + templateUrl
        });

        if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
            //get ai class
            AIClassService.get().success(function (response) {
                $scope.aiClasses = response;
            });

        }

    };

    //cancel 
    $scope.cancel = function () {
        //$scope.showLoading = false;
        $scope.modalInstance.dismiss('cancel');
    };

    //save
    $scope.save = function (isValid) {
        $scope.editForm.submited = true;
        if (isValid) {
            //new part
            if ($scope.index == -1) {
                PartsService.create({
                    url: $scope.selectedPart.url
                }, $scope.part, function (newItem) {
                    //show the new item if it's product
                    if ($scope.selectedPart.name == "PRODUCT") {
                        $scope.parts.unshift(newItem);
                        $scope.modalInstance.dismiss('cancel');
                    }
                    //add any classes and products if any for an active ingredient
                    else if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
                        //add classes
                        AIClassService.addMultipleToAI($scope.classList, newItem, function () {
                            //add products
                            ProductService.addMultipleToAI($scope.productList, newItem, function () {
                                $scope.modalInstance.dismiss('cancel');
                                $scope.refresh();
                            });
                        });
                    } else {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.refresh();
                    }
                });
            } else {
                //edit
                var part = angular.copy($scope.part);
                //delete $scope.part.ID;
                PartsService.update({
                    url: $scope.selectedPart.url + "/" + $scope.part[$scope.selectedPart.primaryKey]
                }, $scope.part, function (newItem) {
                    //show the changes if it's product
                    if ($scope.selectedPart.name == "PRODUCT") {
                        $scope.parts[$scope.index] = newItem;
                        $scope.modalInstance.dismiss('cancel');
                    } else if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
                        //add or remove classes
                        AIClassService.addRemoveMultipleAI($scope.classList, part, function () {
                            //add products
                            ProductService.addRemoveMultipleAI($scope.productList, part, function () {
                                $scope.modalInstance.dismiss('cancel');
                                $scope.refresh();
                            });
                        });
                    } else {
                        $scope.modalInstance.dismiss('cancel');
                        $scope.refresh();
                    }

                });
            }

        }

    };

    //delete
    $scope.deletePart = function (index, part) {
        var part = angular.copy(part);
        $scope.part = part;
        $scope.index = index;
        $scope.deleteModalInstance = $modal.open({
            scope: $scope,
            animation: true,
            size: 'sm',
            templateUrl: 'delete.cshtml'
        });
    }


    $scope.delete = function () {
        PartsService.delete({
            url: $scope.selectedPart.url + "/" + $scope.part[$scope.selectedPart.primaryKey]
        }, {}, function () {
            $scope.deleteModalInstance.dismiss('cancel');
            $scope.refresh();
            //Show a message saying that the part was expired
            $scope.deleteMessage = "'" + $scope.part[$scope.selectedPart.display.columns[0].name] + "' was expired. ";
            //An exception is that Active Ingredients are expired on the first of the next month
            if ($scope.selectedPart.heading == "ACTIVE INGREDIENT") {
                var date = moment().add(1, 'months').format("MM/1/YYYY");
                $scope.deleteMessage = $scope.deleteMessage + "It will expire on " + date + ".";
            }

        });
    }

    $scope.cancelDelete = function () {
        $scope.deleteModalInstance.dismiss('cancel');
    }

    //product
    $scope.searchProduct = function (term) {
        $scope.showProductLoading = true;
        $scope.productSearchResults = {};
        var date = moment().format("DD/MM/YYYY");
        return ProductService.get(date, term).then(function (response) {
            $scope.parts = response.data;
            $scope.showProductLoading = false;
        });
    };

    $scope.searchProductsForAI = function (term) {
        $scope.showProductLoading = true;
        $scope.productSearchResults = {};
        $scope.currentProductPage = 1;
        var date = moment().format("DD/MM/YYYY");
        return ProductService.get(date, term).then(function (response) {
            $scope.products = response.data;
            $scope.showProductLoading = false;
        });
    };

    //add AI class to active ingredient 
    $scope.addClassToAI = function (aiClass) {
        aiClass.status = "new";
        if (!$scope.classList) {
            $scope.classList = {}
        }
        $scope.classList[aiClass.ai_class_name] = aiClass;
    }

    $scope.removeClass = function (index) {
        $scope.classList[index].status = "delete";
    }

    //add product to active ingredient 
    $scope.addProductToAI = function (product) {
        product.status = "new";
        //delete item.status;
        if (!$scope.productList) {
            $scope.productList = {}
        }
        $scope.productList[product.product_name] = product;
    }

    $scope.removeProduct = function (index) {
        $scope.productList[index].status = "delete";
    }

});