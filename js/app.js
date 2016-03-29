'use strict';

var bltApp = angular.module('bltApp', ['ui.router', 'ngCookies', 'ngResource', 'ui.bootstrap', 'nemLogging', 'leaflet-directive', 'angularUtils.directives.dirPagination']);

bltApp.factory('httpInterceptor', ['$rootScope', '$q', '$cookies', '$location', '$timeout', '$injector', function ($rootScope, $q, $cookies, $location, $timeout, $injector) {

    return {
        request: function (config) {
            //include username and password with every request
            config.headers = config.headers || {};
            config.headers['Authorization'] = 'Basic ' + btoa($cookies.get('username') + ":" + $cookies.get('password'));
            config.headers['Accept'] = 'application/json';
            if (config.method == "DELETE") {
                 config.headers['Accept'] = 'text/html';
            }
            return config;
        },
        responseError: function (response) {
            var status = response.status;
            if ($injector.get('$state').current.name == "login") {
                //handled in the Login controller
            } else {
                //if the user is not authorized, redirect them to the login page
                if (status == 401) {
                    $location.path('/login');
                }
            }
            return $q.reject(response);
        }
    };
}]);



bltApp.config(function ($stateProvider, $urlRouterProvider, $httpProvider) {

    $httpProvider.interceptors.push('httpInterceptor');

    $urlRouterProvider.otherwise('/login');
    //login
    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'templates/login.cshtml',
        controller: "LoginController",
        data: {
            isLoginRequired: false,
            hideHeader: true
        }
    })

    //users
    .state('users', {

        url: '/users',
        templateUrl: 'templates/users.cshtml',
        controller: "UserController",
        data: {
            isLoginRequired: true
        },
        resolve: {
            roles: function (RoleService) {
                return RoleService.getAll();
            },
            organizations: function (OrganizationService) {
                return OrganizationService.getAll();
            },
            users: function (UserService) {
                return UserService.getAll();
            },
            divisions: function (DivisionService) {
                return DivisionService.getAll();
            }
        }
    })

    //home
    .state('home', {
        url: '/home',
        templateUrl: 'templates/home.cshtml',
        controller: "HomeController",
        data: {
            isLoginRequired: true
        }
    })

    //parts
    .state('parts', {

        url: '/parts',
        templateUrl: 'templates/parts.cshtml',
        controller: "PartsController",
        data: {
            isLoginRequired: true
        },
        resolve: {}
    })


});

bltApp.run(['$rootScope', 'AuthService', '$state', function ($rootScope, AuthService, $state) {

    $rootScope.$on('$stateChangeStart', function (event, state, params) {
        $rootScope.hideHeader = state.data.hideHeader;

        var isLoginRequired = state.data.isLoginRequired;
        //send user to the login page if login is required for the state 
        //and the user is not logged in
        if (isLoginRequired && !AuthService.isLoggedIn()) {
            event.preventDefault();
            if (state.name != "login") {
                $state.go("login");
            }
        }
        //send user to the home page if they are logged in and 
        //they are going to the login page
        else if (!isLoginRequired && AuthService.isLoggedIn()) {
            event.preventDefault();
            if (state.name == "login") {
                $rootScope.hideHeader = false;
                $state.go("home");
            }
        }

    });
}]);