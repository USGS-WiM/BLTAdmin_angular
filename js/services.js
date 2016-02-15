//Login
bltApp.factory('LoginService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/login', {}, {
        login: {
            method: 'GET',
            cache: false,
            isArray: false
        }
    });
}]); //end of Login

//AuthService
bltApp.factory('AuthService', function ($cookies) {
    return {
        setCredentials: function (credentials) {
            $cookies.put('username', credentials.username);
            $cookies.put('password', credentials.password);
            $cookies.put('roleId', credentials.roleId);
        },
        removeCredentials: function () {
            $cookies.remove('username');
            $cookies.remove('password');
            $cookies.remove('roleId');
        },
        isLoggedIn: function () {
            return $cookies.get('username') && $cookies.get('password') ? true : false;
        },
        getUsername: function () {
            return $cookies.get('username');
        },
        getRoleId: function () {
            return $cookies.get('roleId');
        }
    };
}); //end of Auth

//Users
bltApp.factory('UserService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/users/:id', {}, {
        query: {
            isArray: true
        },
        getAll: {
            method: 'GET',
            isArray: true,
            cache: true
        },
        update: {
            method: 'PUT',
            cache: false,
            isArray: false
        },
        create: {
            method: 'POST',
            cache: false,
            isArray: false
        },
        delete: {
            method: 'DELETE',
            cache: false,
            isArray: false
        }
    });
}]); //end of UserService

//Organizations
bltApp.factory('OrganizationService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/organizations', {}, {
        query: {
            isArray: true
        },
        getAll: {
            method: 'GET',
            cache: true,
            transformResponse: function (data, headers) {
                return _.indexBy(JSON.parse(data), 'ORGANIZATION_ID');
            }
        },
        save: {
            method: 'POST',
            cache: false,
            isArray: false
        },
        delete: {
            method: 'DELETE',
            cache: false,
            isArray: false
        }
    });
}]); //end of OrganizationService

//Roles
bltApp.factory('RoleService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/roles', {}, {
        query: {
            isArray: true
        },
        getAll: {
            method: 'GET',
            cache: true,
            transformResponse: function (data, headers) {
                return _.indexBy(JSON.parse(data), 'ROLE_ID');
            }
        },
        save: {
            method: 'POST',
            cache: false,
            isArray: false
        },
        delete: {
            method: 'DELETE',
            cache: false,
            isArray: false
        }
    });
}]); //end of RoleService

//Divisions
bltApp.factory('DivisionService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/divisions', {}, {
        query: {
            isArray: true
        },
        getAll: {
            method: 'GET',
            cache: true,
            transformResponse: function (data, headers) {
                return _.indexBy(JSON.parse(data), 'DIVISION_ID');
            }
        },
        save: {
            method: 'POST',
            cache: false,
            isArray: false
        },
        delete: {
            method: 'DELETE',
            cache: false,
            isArray: false
        }
    });
}]); //end of DivisionService

//EventService
bltApp.factory('EventService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/Events', {}, {
        get: {
            method: 'GET',
            isArray: true
        }
    });
}]); //end of EventService

//AIService
bltApp.factory('AIService', ['$http', function ($http) {
    return {
        get: function () {
            return $http.get(config.rootURL + "/ActiveIngredients");
        },
        getClasses: function (id) {
            return $http.get(config.rootURL + "/ActiveIngredients/" + id + "/aiClass");
        },
        getProducts: function (id) {
            return $http.get(config.rootURL + "/ActiveIngredients/" + id + "/product");
        }
    };
}]); //end of AIService

//PULAService
bltApp.factory('PULAService', ['$resource', function ($resource) {
    return $resource(config.pulaURL, {}, {
        get: {
            method: 'GET'
        }
    });
}]); //end of PULAService


//PULAPOIService
bltApp.factory('PULAPOIService', function ($http) {
    return {
        get: function (feature, date) {
            return $http.get(config.rootURL + "/PULAs/POI/" + feature.PULA_SHAPE_ID + "/?publishedDate=" + date.month + "/01/" + date.year);
        }
    };
}); //end of PULAPOIService

//VersionService
bltApp.factory('VersionService', function ($http) {
    return {
        get: function (versionId) {
            return $http.get(config.rootURL + "/Version/" + versionId);
        }
    };
}); //end of VersionService

//SpeciesService
bltApp.factory('SpeciesService', function ($http) {
    return {
        get: function (pulaDetails) {
            return $http.get(config.rootURL + "/ActiveIngredientPULA/" + pulaDetails.id + "/Species");
        }
    };
}); //end of SpeciesService

//LimitationsService
bltApp.factory('LimitationsService', function ($http) {
    return {
        get: function (feature, date) {
            return $http.get(config.rootURL + "/PULAs/" + feature.PULA_ID + "/LimitationsForMapper.json?ShapeID=" + feature.PULA_SHAPE_ID + "&EffectDate=" + date.month + "/01/" + date.year);
        }
    };
}); //end of LimitationsService

bltApp.factory('AIClassService', function ($http, $q) {
    return {
        get: function () {
            return $http.get(config.rootURL + "/AIClasses?publishedDate=");
        },
        addToAI: function (aiClassId, ai) {
            ///Products/{entityID}/AddProductToAI
            return $http.post(config.rootURL + "/AIClasses/" + aiClassId + "/AddAIClass", ai);
        },
        removeFromAI: function (aiClassId, ai) {
            return $http.delete(config.rootURL + "/AIClasses/" + aiClassId + "/RemoveAIClassFromAI?activeIngredientID="+ai.ID, ai);
        },
        addMultipleToAI: function (aiClassList, ai, success) {
            var addToAI = this.addToAI;
            var promises = [];
            if (!aiClassList || aiClassList.length == 0) {
                success();
            }
            angular.forEach(aiClassList, function (aiClass) {
                if (aiClass.status != "delete") {
                    promises.push(addToAI(aiClass.ID, ai));
                }
            });
            $q.all(promises).then(function (results) {
                success();
            });
        },
        addRemoveMultipleAI: function (aiClassList, ai, success) {
            var addToAI = this.addToAI;
            var removeFromAI = this.removeFromAI;
            var promises = [];
            if (!aiClassList || aiClassList.length == 0) {
                success();
            }
            angular.forEach(aiClassList, function (aiClass) {
                if (aiClass.status == "delete") {
                    promises.push(removeFromAI(aiClass.ID, ai));                   
                } else if (aiClass.status == "new") {
                     promises.push(addToAI(aiClass.ID, ai));
                }
            });
            $q.all(promises).then(function (results) {
                success();
            });
        }
    };
});

//ProductService
bltApp.factory('ProductService', function ($http, $q) {
    return {
        get: function (date,term) {
             return $http.get(config.rootURL + "/Products?publishedDate=" + date + "&term=" + term);
        },
        addToAI: function (prodID, ai) {
            ///Products/{entityID}/AddProductToAI
            return $http.post(config.rootURL + "/Products/" + prodID + "/AddProductToAI", ai);
        },
        removeFromAI: function (prodID, ai) {
            return $http.delete(config.rootURL + "/Products/" + prodID + "/RemoveProductFromAI?activeIngredientID="+ai.ID);
        },
        addMultipleToAI: function (aiProductList, ai, success) {
            var addToAI = this.addToAI;
            var promises = [];
            if (!aiProductList || aiProductList.length == 0) {
                success();
            }
            angular.forEach(aiProductList, function (aiProduct) {
                if (aiProduct.status != "delete") {
                    promises.push(addToAI(aiProduct.PRODUCT_ID, ai));
                }
            });
            $q.all(promises).then(function (results) {
                success();
            });
        },
        addRemoveMultipleAI: function (aiProductList, ai, success) {
            var addToAI = this.addToAI;
            var removeFromAI = this.removeFromAI;
            var promises = [];
            if (!aiProductList || aiProductList.length == 0) {
                success();
            }
            angular.forEach(aiProductList, function (aiProduct) {
                if (aiProduct.status == "delete") {
                    promises.push(removeFromAI(aiProduct.PRODUCT_ID, ai));                   
                } else if (aiProduct.status == "new") {
                     promises.push(addToAI(aiProduct.PRODUCT_ID, ai));
                }
            });
            $q.all(promises).then(function (results) {
                success();
            });
        }
    };
});
//end of ProductService

//Parts
bltApp.factory('PartsService', ['$resource', function ($resource) {
    return $resource(config.rootURL + '/:url' + "?publishedDate=", {}, {
        query: {
            isArray: true
        },
        getAll: {
            method: 'GET',
            isArray: true,
            cache: false
        },
        update: {
            method: 'PUT',
            cache: false,
            isArray: false
        },
        create: {
            method: 'POST',
            cache: false,
            isArray: false
        },
        delete: {
            method: 'DELETE',
            cache: false,
            isArray: false
        }
    });
}]); //end of PartsService