var bodyParser   = require("body-parser");
var cookieParser = require("cookie-parser");
var express      = require("express");
var lti          = require("ims-lti");
var request      = require("supertest");
var session      = require("express-session");
var should       = require("should");
var url          = require("url");
var util         = require("util");

var middleware = require("../");

var KEY    = "key";
var SECRET = "secret";

var genericProvider = new lti.Provider(KEY, SECRET);

function addNoops (app) {
  app.use(function (req, res, next) {
    res.status(200).end();
  });
  app.use(function (err, req, res, next) {
    res.status(500).end();
  });
  return app;
}

function addValidators (app, expectSession = true) {
  // optionally expect req.session.lti to be set
  app.use((req, res, next) => {
    if(expectSession && !req.session.lti){
      res.status(500).end();
    }
    else{
      next()
    }
  })

  // expect req.lti to be set
  app.use((req, res, next) => {
    res.status(req.lti ? 200 : 500).end();
  });

  // fall through to a 500
  app.use((err, req, res, next) => {
    res.status(500).end();
  });

  return app;
}

function getValidLaunchParams (testUrl) {
  var urlParsed = url.parse(testUrl);
  var fakeRequest = {
    url: '/',
    method: "POST",
    connection: {
      encrypted: false
    },
    headers: {
      host: urlParsed.host
    },
    body: {
      lti_message_type:       'basic-lti-launch-request',
      lti_version:            "LTI-1p0",
      resource_link_id:       "http://my-resource.com/test-url",
      oauth_customer_key:     "key",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp:        Math.round(Date.now() / 1000),
      oauth_nonce:            Math.floor(Math.random() * 0xffffffff)
    }
  };

  var signature = genericProvider.signer.build_signature(fakeRequest, fakeRequest.body, SECRET);
  fakeRequest.body.oauth_signature = signature;

  return fakeRequest.body;
}

function getValidContentItemSelectParams (testUrl) {
  var urlParsed = url.parse(testUrl);
  var fakeRequest = {
    url: '/',
    method: "POST",
    connection: {
      encrypted: false
    },
    headers: {
      host: urlParsed.host
    },
    body: {
      lti_message_type:       'ContentItemSelectionRequest',
      lti_version:            "LTI-1p0",
      oauth_customer_key:     "key",
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp:        Math.round(Date.now() / 1000),
      oauth_nonce:            Math.floor(Math.random() * 0xffffffff)
    }
  };

  var signature = genericProvider.signer.build_signature(fakeRequest, fakeRequest.body, SECRET);
  fakeRequest.body.oauth_signature = signature;

  return fakeRequest.body;
}

describe("express-ims-lti", function () {
  describe("utils", function () {
    it("should expose an lti property that has the ims-lti library", function () {
      should(middleware.lti).be.an.Object;
    });
  });

  describe("Invalid configuration", function () {
    it("should throw an error if params are missing", function () {
      (function () {
        var middleware = middleware();
      }).should.throw();
      (function () {
        var middleware = middleware({ consumer_key: "key" });
      }).should.throw();
      (function () {
        var middleware = middleware({ consumer_secret: "key" });
      }).should.throw();
    });
  });

  describe("Lti requests", function () {
    beforeEach(function () {
      var app = this.app = express();
      app.use(bodyParser.json());
      app.use(cookieParser());
      app.use(session({ resave: false, saveUninitialized: true, secret: "easy" }));
      app.use(middleware({ consumer_key: KEY, consumer_secret: SECRET}));
    });

    it("should be able to pass over a non-lti request", function (done) {
      request(addNoops(this.app))
        .post("/")
        .send({ test: "test" })
        .expect(200, done);
    });

    it("should be able to pick out an lti login request with basic launch requests", function (done) {
      // We test for a 500 error here because the LTI request will not be valid
      // as some necessary request params are not present.
      request(addNoops(this.app))
        .post("/")
        .send({ lti_message_type: "basic-lti-launch-request" })
        .expect(500, done);
    });

    it("should be able to pick out an lti login request with content item selection requests", function (done) {
      // We test for a 500 error here because the LTI request will not be valid
      // as some necessary request params are not present.
      request(addNoops(this.app))
        .post("/")
        .send({ lti_message_type: "ContentItemSelectionRequest" })
        .expect(500, done);
    });

    it("should be pass over an unsupported lti_message_type", function (done) {
      // We test for a 200 here because the lti validate process would 500 if it was being run
      // as some necessary request params are not present.
      request(addNoops(this.app))
        .post("/")
        .send({ lti_message_type: "someWeirdUnsupportedMessageType" })
        .expect(200, done);
    });

    it("should add the lti property to the request object with basic launch requests", function (done) {
      var test = request(addValidators(this.app)).post("/");

      test
        .send(getValidLaunchParams(test.url))
        .expect(200, done);
    });

    it("should add the lti property to the request object with content item selection requests", function (done) {
      var test = request(addValidators(this.app)).post("/");

      test
        .send(getValidContentItemSelectParams(test.url))
        .expect(200, done);
    });

  });


  describe("Valid lti requests with addToSession off", function () {
    beforeEach(function () {
      var app = this.app = express();
      app.use(bodyParser.json());
      app.use(cookieParser());
      app.use(session({ resave: false, saveUninitialized: true, secret: "easy" }));

      app.use(middleware({
        addToSession: false,
        credentials: function (key, callback) {
          callback(null, KEY, SECRET);
        }
      }));
    });

    it("should add the lti property to the request object but not set session if successful with launch", function (done) {
      var test = request(addValidators(this.app, false)).post("/");

      test
        .send(getValidLaunchParams(test.url))
        .expect(200, done);
    });

    it("should add the lti property to the session object but not set session if successful with item selection", function (done) {
      var test = request(addValidators(this.app, false)).post("/");

      test
        .send(getValidContentItemSelectParams(test.url))
        .expect(200, done);
    });


  });
});
