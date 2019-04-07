"use strict";

(function() {
  var root = this;
  var previous_LsDataSource = root.LsDataSource;

  var toQueryString = function(obj) {
    var parts = [];

    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (Array.isArray(obj[i])) {
          obj[i].forEach(function(val) {
            parts.push(encodeURIComponent(i+"[]") + "=" + encodeURIComponent(val));
          });
        } else {
          parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
        }
      }
    }

    return parts.join("&");
  };



  var get = function(url, data, onSucess, onFail) {
    var httpRequest = new XMLHttpRequest();

    if (!httpRequest) {
      console.error('Giving up :( Cannot create an XMLHTTP instance');
      return false;
    }

    if (data) {
      var fullUrl = "https://cors-anywhere.herokuapp.com/https:" + url + "?" + toQueryString(data);
    } else {
      console.error('Cannot make a request without data!');
      return false;
    }

    httpRequest.onreadystatechange = function() {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200) {
          onSucess(JSON.parse(httpRequest.responseText));
        } else {
          if (onFail) {
            onFail({ status: httpRequest.status, error: httpRequest.responseText });
          }
        }
      }
    };

    httpRequest.open('GET', fullUrl);
    httpRequest.send();
  };

  var LsDataSource = {
    name: 'LittleSis',
    baseUrl: '//littlesis.org',

    api: function(url, foo, extra_data) {
      var proxyurl = "https://cors-anywhere.herokuapp.com/";
      var api_url = 'https://littlesis.org/api/'+url;
      $.ajax({
         url: proxyurl + api_url,
         data: extra_data || {},
         beforeSend: function(xhr){
           xhr.setRequestHeader('Littlesis-Api-Token', 'ShIwQk6mLYBi_NLTDnX66Q');
         },
         fail: function() {
           foo(false);
         },
         success: function(response) {
           foo(response);
         }
      });
    },

    findNodes: function(text, callback) {
      self.lastFindNodesAjax = get(
        this.baseUrl + '/maps/find_nodes',
        { num: 5, with_ids: true, q: text }, //num is even being used by littlesis, but has no effect!
        callback, //success
        function(e) { //fail
          callback(false);
        }
      );
    },

    getNodeWithEdges: function(nodeId, nodeIds, callback) {
      get(
        this.baseUrl + '/maps/node_with_edges',
        { node_id: nodeId, node_ids: nodeIds },
        callback,
        function() {
          callback(false);
        }
      );
    },

    getConnectedNodesOptions: {
      category_id: {
        1: "Position",
        2: "Education",
        3: "Membership",
        4: "Family",
        5: "Donation",
        6: "Transaction",
        7: "Lobbying",
        8: "Social",
        9: "Professional",
        10: "Ownership",
        11: "Hierarchy",
        12: "Generic"
      }
    },

    getConnectedNodes: function(nodeId, nodeIds, options, callback) {
      options = options || {};
      options.node_id = nodeId;
      options.node_ids = nodeIds;

      get(
        this.baseUrl + '/maps/edges_with_nodes',
        options,
        callback
      );
    },

    getInterlocks: function(node1Id, node2Id, nodeIds, options, callback) {
      options = options || {};
      options.node1_id = node1Id;
      options.node2_id = node2Id;
      options.node_ids = nodeIds;

      get(
        this.baseUrl + '/maps/interlocks',
        options,
        callback
      );
    }
  };

  LsDataSource.noConflict = function() {
    root.LsDataSource = previous_LsDataSource;
    return LsDataSource;
  };

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = LsDataSource;
    }

    exports.LsDataSource = LsDataSource;
  }
  else {
    root.LsDataSource = LsDataSource;
  }

}).call(this);
