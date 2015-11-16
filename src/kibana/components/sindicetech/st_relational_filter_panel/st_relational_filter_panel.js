define(function (require) {

  require('css!components/sindicetech/st_relational_filter_panel/styles/st_relational_filter_panel.css');

  require('jquery');
  require('eeg');
  require('eeg-angular');

  var _ = require('lodash');
  var $ = require('jquery');

  var app = require('modules').get('kibana');

  app.directive(
    'stRelationalFilterPanel',
    function ($location, config, configFile, $rootScope, Private, savedDashboards, savedSearches, Notifier) {

      var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
      var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
      var notify = new Notifier({
        location: 'Relational Filter Panel'
      });

      return {
        restrict: 'E',
        template: require('text!components/sindicetech/st_relational_filter_panel/st_relational_filter_panel.html'),
        link: function ($scope, $el) {


          $scope.relationalPanelConfig = {
            enabled: false
          };

          var  _saveRelationalPanelConfig = function () {
            //return a promise so we can do action when it is resolved
            return config.set('kibi:relationalPanelConfig', $scope.relationalPanelConfig);
          };


          var init = false;
          var _initPanel = function () {
            var g = {
              options: {
                title: 'Check required relations',
                monitorContainerSize: true,
                alwaysShowLinksLabels: true,
                stopAfter: 2000,
                groupingForce: {},
                nodeIcons: {},
                minNodeSize: 30
              },
              nodes: [],
              links: []
            };


            if ($scope.relationalPanelConfig.graph && $scope.relationalPanelConfig.graph.groupingForce) {
              g.options.groupingForce = $scope.relationalPanelConfig.graph.groupingForce;
            }
            if ($scope.relationalPanelConfig.graph && $scope.relationalPanelConfig.graph.nodeIcons) {
              g.options.nodeIcons = $scope.relationalPanelConfig.graph.nodeIcons;
            }


            // each node is a dashboard
            var dashboards = [];
            _.each($scope.relationalPanelConfig.relations, function (relation) {
              if (dashboards.indexOf(relation.from) === -1) {
                dashboards.push(relation.from);
              }
              if (dashboards.indexOf(relation.to) === -1) {
                dashboards.push(relation.to);
              }
            });
            _.each(dashboards, function (dashboardId) {
              g.nodes.push({id: dashboardId, label: dashboardId, nodeType: dashboardId, size: g.options.minNodeSize});
            });


            _.each($scope.relationalPanelConfig.relations, function (relation, index) {

              g.links.push({
                source: relation.from,
                target: relation.to,
                linkType: 'link',
                htmlElement: $('<div>').html(
                  '<div style="width:69px;">' +
                    '<input type="checkbox" ' + (relation.enabled ? 'checked' : '') + '/>' +
                    '&nbsp;<label> ' + relation.fromPath + '-> ' + relation.toPath + '</label>' +
                  '</div>').get(0),
                htmlElementWidth: 70,
                htmlElementHeight: 18,
                onLinkClick: function (THIS, d, i) {
                  if ($(THIS).find('input[type=\'checkbox\']').is(':checked')) {
                    enableRelation(index);
                  } else {
                    disableRelation(index);
                  }
                }
              });

            });

            $scope.graph = g;
            init = true;
          };

          var enableRelation = function (relationIndex) {
            if (init) {
              $scope.relationalPanelConfig.relations[relationIndex].enabled = true;
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanelConfig().then(function () {
                if ($scope.relationalPanelConfig.enabled) {
                  joinFilterHelper.updateJoinFilter();
                }
              });
            }
          };

          var disableRelation = function (relationIndex) {
            if (init) {
              $scope.relationalPanelConfig.relations[relationIndex].enabled = false;
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanelConfig().then(function () {
                if ($scope.relationalPanelConfig.enabled) {
                  joinFilterHelper.updateJoinFilter();
                }
              });
            }
          };

          var _checkFilterJoinPlugin = function () {
            var enabled = joinFilterHelper.isRelationalPanelEnabled();
            var installed = joinFilterHelper.isFilterJoinPluginInstalled();
            if (enabled && !installed) {
              notify.error(
                'The FilterJoin plugin is enabled but not installed. ' +
                'Please install the plugin and restart Kibi or ' +
                'disable the relationalPanel in Settings -> Advanced -> kibi:relationalPanelConfig');
            }
          };

          $rootScope.$on('init:config', function () {
            $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
            _checkFilterJoinPlugin();
            _initPanel();
          });


          // recreate it after user change configuration
          $rootScope.$on('change:config.kibi:relationalPanelConfig', function () {
            $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
            _checkFilterJoinPlugin();
            if ($scope.ignoreNextConfigurationChangedEvent === true) {
              $scope.ignoreNextConfigurationChangedEvent = false;
            } else {
              _initPanel();
            }
          });

          $scope.show = false;
          $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
            $scope.show = relationalFilterPanelOpened;
          });

          $scope.close = function () {
            $scope.show = false;
            $rootScope.$emit('relationalFilterPanelClosed', false);
          };


          $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
            $scope.show = false;
            if (urlHelper.isItDashboardUrl() && init && $scope.relationalPanelConfig.enabled) {
              // try to enable filter when user switch to dashboards app
              joinFilterHelper.updateJoinFilter();
            }
          });


          $scope.disableFilter = function () {
            $scope.relationalPanelConfig.enabled = false;
            _saveRelationalPanelConfig().then(function () {
              // here just remove the joinFilter if present
              urlHelper.removeJoinFilter();
              // remove join_set for all dashboards from kibi_state
              kibiStateHelper.removeAllFiltersOfType('join_set');
            });
          };

          $scope.enableFilter = function () {
            $scope.relationalPanelConfig.enabled = true;
            _saveRelationalPanelConfig().then(function () {
              joinFilterHelper.updateJoinFilter();
            });
          };

        } // end of link function
      };
    });

});
