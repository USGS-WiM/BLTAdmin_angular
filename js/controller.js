bltApp.controller('LoginController', function ($scope, LoginService, AuthService, $location, $rootScope) {

    $scope.hideHeader = true;
    $scope.credentials = {};
    //login
    $scope.login = function () {
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
                    $scope.credentials.roleId = response.ROLE_ID;
                    AuthService.setCredentials($scope.credentials);
                    //send user to the home page
                    //after a successful login
                    $rootScope.$broadcast('userLoggedIn');
                    $location.path("/home");
                } else {
                    console.log("Login Failed");
                }
            },
            function error(errorResponse) {
                //remove credentials
                AuthService.removeCredentials();
                //TODO: show error message
            });

    }

});




bltApp.controller('HomeController', function ($scope, $location, AuthService, leafletData, $modal, PULAService, activeIngredients, limitToFilter, UserService, EventService, ProductService, PULAPOIService, VersionService, SpeciesService, LimitationsService, roles, EventPULAService) {
    //guest
    //get event id
    if (AuthService.getEventId()) {
        var isGuest = true;
        $scope.eventId = AuthService.getEventId();
        $scope.hideFilters = true;
        $scope.hideMenu = true;
    } else {

        EventService.get({}, function (events) {
            $scope.events = _.indexBy(events, "EVENT_ID");
            $scope.showPULALoading = false;
        });
    }

    //get user role
    $scope.role = roles[AuthService.getRoleId()];

    $scope.noPULAs = false;
    //$scope.showPULALoading = true;
    $scope.filter = {};
    $scope.filter.event = "All";

    $scope.activeIngredients = activeIngredients;

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
                visible: true
            }).addTo(map);
            $scope.pula = pula;
            //add the address seach bar
            searchControl.addTo(map);
            // create an empty layer group to store the results and add it to the map
            results.addTo(map);

            map.on('click', function (e) {
                getPULADetails(e, map);
            });

            pula.setLayerDefs(getLayerDefs());
        }
    );


    var getLayerDefs = function () {
        if (!isGuest) {
            return {
                0: "PULA_SHAPE_ID IS NULL",
                1: "CREATED_TIME_STAMP <= timestamp '" + formatDate + "' AND (PUBLISHED_TIME_STAMP IS NULL AND EXPIRED_TIME_STAMP IS NULL)",
                2: "PUBLISHED_TIME_STAMP <= timestamp '" + formatDate + "' AND ((EFFECTIVE_DATE > timestamp '" + formatDate + "') OR (EFFECTIVE_DATE IS NULL)) AND EXPIRED_TIME_STAMP IS NULL",
                3: "EFFECTIVE_DATE <= timestamp '" + formatDate + "' AND PUBLISHED_TIME_STAMP <= timestamp '" + formatDate + "' AND ((EXPIRED_TIME_STAMP >= timestamp '" + monthYear + "') OR (EXPIRED_TIME_STAMP IS NULL))",
                4: "(EXPIRED_TIME_STAMP <= timestamp '" + monthYear + "')"

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

    //get limitations
    var getPULADetails = function (e, map) {
        //show loading indicator
        $scope.showPULALoading = true;
        //        $scope.modalLoading = $modal.open({
        //            scope: $scope,
        //            animation: true,
        //            templateUrl: 'loading.cshtml'
        //        });
        $scope.pula.identify().on(map).at(e.latlng).run(function (error, featureCollection) {
            if (featureCollection.features.length > 0) {
                //highlight the pula that was clicked
                var feature = featureCollection.features[0].properties;
                if ($scope.identifiedFeature) {
                    map.removeLayer($scope.identifiedFeature);
                }
                $scope.identifiedFeature = new L.GeoJSON(featureCollection.features[0], {
                    style: function () {
                        return {
                            color: '#FFFF00',
                            weight: 2
                        };
                    }
                }).addTo(map);

                //get the effective date, comments, event, entity id
                if (feature.PULA_ID != "Null" && feature.PULA_SHAPE_ID != "Null") {
                    PULAPOIService.get(feature, $scope.seclectedDate).success(function (response) {
                        $scope.pulaDetails = {};
                        if (response && response != "") {
                            //pula id
                            $scope.pulaDetails.id = response.ID;
                            $scope.pulaDetails.pulaId = response.PULA_ID;
                            $scope.pulaDetails.isPublished = response.IS_PUBLISHED;

                            //effective date
                            $scope.pulaDetails.effectiveDate = response.EFFECTIVE_DATE ? moment(response.EFFECTIVE_DATE).format("MM/DD/YYYY") : "";
                            //comments
                            var commentList = [];
                            if (response.COMMENTS) {
                                var comments = response.COMMENTS.split("]");
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
                            $scope.pulaDetails.comments = commentList;

                            //event
                            var eventID = response.EVENT_ID;
                            $scope.pulaDetails.event = $scope.events[eventID].NAME;
                            //version
                            var versionId = response.VERSION_ID;

                            //justification information
                            $scope.pulaDetails.baseData = response.BASE_DATA;
                            $scope.pulaDetails.baseDataModifiers = response.BASE_DATA_MODIFIERS;
                            $scope.pulaDetails.biologicalOpinion = response.BIOLOGICAL_OPINION_LIT;
                            $scope.pulaDetails.additionalInfo = response.ADDITIONAL_INFORMATION;
                        }

                        VersionService.get(versionId).success(function (response) {
                            var version = response;
                            $scope.pulaDetails.version = version;
                            $scope.pulaDetails.creationDate = version.CREATED_TIME_STAMP ? moment(version.CREATED_TIME_STAMP).format("MM/DD/YYYY") : "";
                            $scope.pulaDetails.publishedDate = version.PUBLISHED_TIME_STAMP ? moment(version.PUBLISHED_TIME_STAMP).format("MM/DD/YYYY") : "";
                            $scope.pulaDetails.expirationDate = version.EXPIRED_TIME_STAMP ? moment(version.EXPIRED_TIME_STAMP).format("MM/DD/YYYY") : "";
                            //get users
                            //creator
                            if (version.CREATOR_ID) {
                                UserService.query({
                                    id: version.CREATOR_ID
                                }, function (response) {
                                    var creator = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.creator = creator.FNAME + " " + creator.LNAME;
                                });
                            }
                            //publisher
                            if (version.PUBLISHER_ID) {
                                UserService.query({
                                    id: version.PUBLISHER_ID
                                }, function (response) {
                                    var publisher = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.publisher = publisher.FNAME + " " + publisher.LNAME;
                                });
                            }
                            //expirer
                            if (version.EXPIRER_ID) {
                                UserService.query({
                                    id: version.EXPIRER_ID
                                }, function (response) {
                                    var expirer = response.length == 1 ? response[0] : response;
                                    $scope.pulaDetails.expirer = expirer.FNAME + " " + expirer.LNAME;
                                });
                            }
                            //console.log($scope.pulaDetails);
                        });

                        //get the species
                        ///ActiveIngredientPULA/{activeIngredientPULAID}/Species
                        SpeciesService.get($scope.pulaDetails)
                            .success(function (response) {
                                $scope.pulaDetails.species = response.SPECIES;
                            });
                    });


                    //get the limitations

                    LimitationsService.get(feature, $scope.seclectedDate)
                        .success(function (response) {
                            $scope.pulaDetails.mapperLimits = response.MapperLimits;
                            $scope.showPULALoading = false;
                        });
                } else {
                    $scope.showPULALoading = false;
                }
            }
        });
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
                    $scope.productSearchResults[item.PRODUCT_NAME] = item;
                    return item.PRODUCT_NAME;
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

    $scope.clearPULAFilter = function () {
        $scope.noPULAs = false;
        $scope.filter.event = "All";
        $scope.filter.ai = "";
        $scope.filter.product = "";
        $scope.filterShapes();
    }

    $scope.filterShapes = function () {
        $scope.noPULAs = false;
        $scope.showLoading = true;
        //1. get date, active ingredient, event and product
        var event = $scope.filter.event;
        var ai = $scope.filter.ai;
        var product = $scope.filter.product;

        PULAService.get({
            date: $scope.date.month + " " + $scope.date.year,
            eventID: event != "All" ? event : "0",
            productID: product ? product : "0",
            aiID: ai ? ai : "0"
        }, function (response) {
            var publishedPulaShapes = [];
            var effectivePulaShapes = [];
            var expiredPulaShapes = [];
            var pulaList = response.PULA;
            var pula, effectiveDate, expiredDate;
            var chosenDate = moment($scope.date.month + " " + $scope.date.year);
            if (pulaList.length == 0) {
                $scope.showLoading = false;
                $scope.noPULAs = true;
            }
            for (var i = 0; i < pulaList.length; i++) {
                pula = pulaList[i];
                effectiveDate = pula.Effective;
                expiredDate = pula.Expired;
                //published if (effective is null OR after chosenDate) AND (expired is null or after chosendate)
                if ((!effectiveDate || moment(effectiveDate).isAfter(chosenDate)) && (expiredDate || moment(expiredDate).isAfter(chosenDate))) {
                    publishedPulaShapes.push(pula.ShapeID);
                }
                //effective if (effective is <= chosen date AND (expired is null OR after chosenDate)
                if ((!moment(effectiveDate).isAfter(chosenDate)) && (!expiredDate || moment(expiredDate).isAfter(chosenDate))) {
                    effectivePulaShapes.push(pula.ShapeID);
                }
                //ExpiredList.PULA = PULAlist.PULA.Where(x => (x.Expired.HasValue && x.Expired.Value <= chosenDate)).ToList();
                if (expiredDate && !moment(expiredDate).isAfter(chosenDate)) {
                    expiredPulaShapes.push(pula.ShapeID);
                }
            }
            var layers = {
                0: "1=0",
                1: "1=0",
                2: publishedPulaShapes.length == 0 ? "1=0" : "PULA_SHAPE_ID = " + publishedPulaShapes.join(" or PULA_SHAPE_ID = "),
                3: effectivePulaShapes.length == 0 ? "1=0" : "PULA_SHAPE_ID = " + effectivePulaShapes.join(" or PULA_SHAPE_ID = "),
                4: expiredPulaShapes.length == 0 ? "1=0" : "PULA_SHAPE_ID = " + expiredPulaShapes.join(" or PULA_SHAPE_ID = ")
            }
            $scope.pula.setLayerDefs(layers);
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
        var comments = $scope.pulaDetails.comments;
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
        contributor.password = "AbEv" + $scope.pulaDetails.EVENT_ID + "$BLTDefau1t" + text;
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
    $scope.addExpirationDate = function () {
        var date = $scope.expirationDate;
        date.month = $scope.months.indexOf(date.month) + 1;
        PULAPOIService.expire($scope.pulaDetails.id, date).success(function () {
            $scope.pulaDetails.expirationDate = date.month + "/01/" + date.year;
        });
    }

    //publish PULA
    $scope.publishPULA = function () {
        var date = $scope.expirationDate;
        date.month = $scope.months.indexOf(date.month) + 1;
        PULAPOIService.publish($scope.pulaDetails.id).success(function () {
            $scope.pulaDetails.isPublished = 1; //double check
        });
    }


    //if guest show the event based PULAs
    if (isGuest) {
        $scope.showLoading = true;
        EventPULAService.get($scope.eventId).success(function (response) {
            var createdPulaShapes = [];
            var pulaList = response.PULA;
            if (pulaList.length == 0) {
                $scope.showLoading = false;
                $scope.noPULAs = true;
            }
            for (var i = 0; i < pulaList.length; i++) {
                pula = pulaList[i];
                createdPulaShapes.push(pula.ShapeID);
            }
            var layers = {
                0: "1=0",
                1: createdPulaShapes.length == 0 ? "1=0" : "PULA_SHAPE_ID = " + createdPulaShapes.join(" or PULA_SHAPE_ID = "),
                2: "1=0",
                3: "1=0",
                4: "1=0"
            }
            $scope.pula.setLayerDefs(layers);
            $scope.showLoading = false;
        });

    }
});

bltApp.controller('HeaderCtrl', function ($scope, $location, AuthService) {
    $scope.user = {};
    $scope.user.name = AuthService.getUsername();
    $scope.$on("userLoggedIn", function (event) {
        $scope.user.name = AuthService.getUsername();
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

    $scope.selected = {};
    $scope.editForm = {};
    $scope.organizations = organizations;
    $scope.roles = roles;
    $scope.users = users;
    $scope.divisions = divisions;

    //Add or update user
    $scope.editUser = function (index) {
        $scope.userIndex = index;
        if (index == -1) {
            $scope.user = {};
            $scope.editForm.submited = false;
            $scope.editForm.title = "Add New User";
        } else {
            var user = angular.copy($scope.users[index]);
            $scope.selected.organization = $scope.organizations[user.ORGANIZATION_ID];
            $scope.selected.role = $scope.roles[user.ROLE_ID];
            $scope.selected.division = $scope.divisions[user.DIVISION_ID];
            $scope.user = user;
            $scope.editForm.title = "Edit User '" + user.USERNAME + "'";
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
            var org = $scope.selected.organization;
            var role = $scope.selected.role;
            var division = $scope.selected.division;
            user.ORGANIZATION_ID = org ? org.ORGANIZATION_ID : null;
            user.ROLE_ID = role ? role.ROLE_ID : null;
            user.DIVISION_ID = division ? division.DIVISION_ID : null;

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
                    id: user.USER_ID
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
            id: user.USER_ID
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
    });

    var pageSize = config.parts.pageSize;
    $scope.showLoading = true;
    $scope.config = {
        parts: config.parts.db
    };
    $scope.editForm = {};
    $scope.selectedPart = {};
    $scope.selectedPart.active = false;

    //query the specific type of part and display the results
    $scope.showPart = function (name) {
        $scope.currentPage = 1;
        $scope.showLoading = true;
        $scope.search = "";
        $scope.data = [];
        $scope.selectedPart.active = false;
        $scope.selectedPart = $scope.config.parts[name];
        $scope.selectedPart.name = name;
        $scope.selectedPart.active = true;
        if (!$scope.selectedPart.search) {
            PartsService.getAll({
                    url: $scope.selectedPart.url
                },
                function (response) {

                    $scope.parts = response;
                    $scope.showLoading = false;

                });
        } else {
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
        if (index == -1) {
            if (copy) {
                $scope.part = part;
            } else {
                $scope.part = {};
            }
            $scope.editForm.submited = false;
            $scope.editForm.title = "Add New " + $scope.selectedPart.heading;
        } else {
            var part = angular.copy(part);
            delete part.VERSION_ID; //don't send the version id
            $scope.part = part;
            $scope.editForm.title = "Edit";
            if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
                //get classes associated with the active ingredient
                AIService.getClasses(part.ACTIVE_INGREDIENT_ID).success(function (response) {
                    $scope.classList = _.indexBy(response, "AI_CLASS_NAME");
                });
                //get products associated with the active ingredient
                AIService.getProducts(part.ACTIVE_INGREDIENT_ID).success(function (response) {
                    $scope.productList = _.indexBy(response, "PRODUCT_NAME");
                });
            }

        }
        var templateUrl = $scope.selectedPart.name == "ACTIVE INGREDIENT" ? "edit-part-ai.cshtml" : "edit-part.cshtml"
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
                }, $scope.part, function (newAI) {
                    //add any classes and products if any for an active ingredient
                    if ($scope.selectedPart.name == "ACTIVE INGREDIENT") {
                        //add classes
                        AIClassService.addMultipleToAI($scope.classList, newAI, function () {
                            //add products
                            ProductService.addMultipleToAI($scope.productList, newAI, function () {
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
                //console.log($scope.part);
                //edit
                var ai = angular.copy($scope.part);
                PartsService.update({
                    url: $scope.selectedPart.url + "/" + $scope.part[$scope.selectedPart.primaryKey]
                }, $scope.part, function () {

                    //add or remove classes
                    AIClassService.addRemoveMultipleAI($scope.classList, ai, function () {
                        //add products
                        ProductService.addRemoveMultipleAI($scope.productList, ai, function () {
                            $scope.modalInstance.dismiss('cancel');
                            $scope.refresh();
                        });
                    });

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
        });
    }

    $scope.cancelDelete = function () {
        $scope.deleteModalInstance.dismiss('cancel');
    }

    //product
    $scope.searchProduct = function (term) {
        $scope.productSearchResults = {};
        if (term.length < 3) {
            return [];
        } else {
            var date = moment().format("DD/MM/YYYY");
            return ProductService.get(date, term).then(function (response) {
                return response.data.map(function (item) {
                    $scope.productSearchResults[item.PRODUCT_NAME] = item;
                    return item.PRODUCT_NAME;
                });
            });
        }
    };

    //add AI class to active ingredient 
    $scope.addClassToAI = function (aiClass) {
        aiClass.status = "new";
        if (!$scope.classList) {
            $scope.classList = {}
        }
        $scope.classList[aiClass.AI_CLASS_NAME] = aiClass;
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
        $scope.productList[product.PRODUCT_NAME] = product;
    }

    $scope.removeProduct = function (index) {
        $scope.productList[index].status = "delete";
    }

});