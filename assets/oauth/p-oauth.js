/**
 * @ngdoc     service
 * @name      alquimia.alquimia:oauth
 * @requires  ngCookies
 * @author    Mauro Constantinescu <mauro.constantinescu@gmail.com>
 * @copyright © 2015 White, Red & Green Digital S.r.l.
 *
 * @description
 * Provides login using one of three OAuth2 authentication modes
 * (see {@link alquimia.alquimia:oauth#methods_login login}). It
 * requires pretty URLs (no hash).
 */
module.exports = [function OAuthProvider() {
  let $window, $http, $q, $cookies, $location;

  /**
   * @ngdoc    method
   * @name     OAuth
   * @methodOf alquimia.alquimia:oauth
   *
   * @param {string} server    The server oauth API endpoint URL.
   * @param {string} clientId  The application's client ID.
   * @param {string} cookieKey The key under which cookies will be saved. Default: 'qOAuth2'.
   *
   * @returns {object}
   * A new OAuth instance. It contains three constants that you should use when calling
   * {@link alquimia.alquimia:oauth#methods_login login}:
   *
   * - `TYPE_CLIENT_CREDENTIALS`: represents the OAuth2 Client Credentials grant type.
   * - `TYPE_USER_CREDENTIALS`: represents the OAuth2 User Credentials grant type.
   * - `TYPE_IMPLICIT`: represents the OAuth2 Implicit grant type.
   *
   * @description
   * Creates a new OAuth instance, from which you can call
   * {@link alquimia.alquimia:oauth#methods_login login}.
   *
   * The `server` param is usually the same URL you give to the {@link alquimia.alquimia:WPApi WPApi}
   * service, ending with `/oauth` instead of `/wp-json`.
   */
  class OAuth {
    constructor(server, clientId, cookieKey = 'qOAuth2') {
      this.TYPE_CLIENT_CREDENTIALS = 'client_credentials';
      this.TYPE_USER_CREDENTIALS = 'password';
      this.TYPE_IMPLICIT = 'token';
      this.AUTHORIZE = 'authorize';
      this.TOKEN = 'token';

      if (!server) throw Error('OAuth: please provide the server URL');
      if (!clientId) throw Error('OAuth: please provide the client ID');

      this.CLIENT_ID = clientId;
      this.SERVER = server.replace(/([^\/])$/, '$1/') + 'oauth/';
      this.COOKIE_KEY = cookieKey;
    }

    /**
     * @ngdoc    method
     * @name     setSecret
     * @methodOf alquimia.alquimia:oauth
     *
     * @param {string} clientSecret The application client secret.
     *
     * @description
     * Sets the client secret in case of login with `TYPE_CLIENT_CREDENTIALS` or `TYPE_USER_CREDENTIALS`.
     * **Use this only for testing purpose.** In production, you should use `TYPE_IMPLICIT` when logging
     * in within JavaScript.
     */
    setSecret(clientSecret) {
      console.warn('In production, you should use TYPE_IMPLICIT when logging in within JavaScript.');
      this.CLIENT_SECRET = clientSecret;
    }

    tryLogin(type = this.TYPE_IMPLICIT) {
      return this.login(type, true);
    }

    /**
     * @ngdoc    method
     * @name     login
     * @methodOf alquimia.alquimia:oauth
     *
     * @param {string} type      The grant type. Use one of three constants from
     *                           {@link alquimia.alquimia:oauth#methods_oauth OAuth}.
     *                           Default: `TYPE_IMPLICIT`.
     * @param {boolean} isTry    Whether or not this is a try. If true, when failing to retrieve the
     *                           access token from cache or from cookies, the user will not be redirected
     *                           to the server for logging in.
     * @param {string}  username Optional. The username, in case you are using `TYPE_USER_CREDENTIALS`.
     * @param {string}  password Optional. The password, in case you are using `TYPE_USER_CREDENTIALS`.
     *
     * @returns {Promise}        A JavaScript `Promise`. If it resolves, all the future HTTP requests
     *                           (even the ones made by `Restangular`) will be automatically authenticated.
     *
     * @description
     * Attempts to log in using the provided grant type. In production, you should call this method
     * without arguments and let it log in through the Implicit grant type. If you use any grant type
     * that is not `TYPE_IMPLICIT`, call {@link alquimia.alquimia:oauth#methods_setSecret setSecret}
     * before this, or you will get an error (the client secret is required for any grant type except
     * Implicit).
     */
    login(type = this.TYPE_IMPLICIT, isTry = false, username, password) {
      return $q((resolve, reject) => {
        if (type == this.TYPE_USER_CREDENTIALS && !(username && password)) {
          reject('Username and password not provided');
          return;
        }

        /* Token cached */
        if (this.accessToken) {
          resolve();
          return;
        }

        /* Token from cookies */
        let cookie = $cookies.get(this.COOKIE_KEY);

        if (cookie) {
          let data = atob(cookie).split(':');
          this.accessToken = data[0];
          this.setHttpDefault(data[0]);
          resolve();
          return;
        }

        let hash = $window.location.hash.substring(1);

        /*
        Token from hash (without router or in html5 mode)
        Enclose everything in a function so we can set a hash variable
        without conflicts with the already declared one
         */
        if (hash && (() => {
          let hash = this.decodeHash(location.hash.substring(1));

          if (hash.access_token) {
            /*
            Two different ways for emptying the hash:
            If we don't have the router, just empty window.location, as $location wouldn't work.
            If we have the router, use $location, otherwise a page refresh is triggered causing
            an infinite loop.
             */
            try {
              angular.module('ngRoute');
              $location.hash('');
            } catch (e) {
              location.hash = '';
            }

            this.accessToken = hash.access_token;
            this.saveToken(hash);
            resolve();
            return true;
          }
        })()) {
          return true;
        }

        if (isTry) {
          reject();
          return;
        }

        /* Token from server */
        let data = {};

        switch (type) {
          case this.TYPE_USER_CREDENTIALS:
            data.username = username;
            data.password = password;
            break;

          case this.TYPE_CLIENT_CREDENTIALS:
            break;

          case this.TYPE_IMPLICIT:
            let request = [], requestObj = {
              response_type: type,
              client_id: this.CLIENT_ID,
              redirect_uri: encodeURIComponent(window.location.href)
            };

            for (var i in requestObj) request.push(`${i}=${requestObj[i]}`);
            request = `?${request.join('&')}`;

            window.location.href = this.SERVER + this.AUTHORIZE + request;
            return;

          default:
            return;
        }

        if (this.CLIENT_SECRET) {
          $http({
            method: 'POST',
            url: SERVER + TOKEN,
            headers: {
              Authorization: `Basic${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
            },
            data: angular.extend(data, {
              grant_type: type
            }),
          }).then(response => {
            this.accessToken = response.data.access_token;
            this.saveToken(response.data);
            resolve();
          }, function() {
            console.error(arguments);
          });
        } else {
          console.error('OAuth: please provide the client secret.');
        }
      });
    }

    logout() {
      this.accessToken = null;
      $cookies.remove(this.COOKIE_KEY);
      location.reload();
    }

    saveToken(data) {
      let expiration = new Date();
      expiration.setTime(expiration.getTime() + data.expires_in * 1000);

      let cookie = btoa([
        data.access_token,
        data.token_type,
        data.scope
      ].join(':'));

      $cookies.put(this.COOKIE_KEY, cookie, { expires: expiration });
      this.setHttpDefault(data.access_token);
    }

    setHttpDefault(accessToken) {
      $http.defaults.withCredentials = true;
      $http.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    }

    decodeHash(hash) {
      let hashObj = {};

      if (hash) {
        /* $location adds a / after the hash */
        if (hash.charAt(0) == '/') hash = hash.substring(1);

        hash = hash.split('&');

        for (let fragment of hash) {
          fragment = fragment.split('=');
          hashObj[fragment[0]] = fragment[1];
        }
      }

      return hashObj;
    }
  }

  this.$get = ['$window', '$http', '$q', '$cookies', '$location',
    function(_$window, _$http, _$q, _$cookies, _$location) {

    $window = _$window;
    $http = _$http;
    $q = _$q;
    $cookies = _$cookies;
    $location = _$location;

    return OAuth;
  }];
}];
