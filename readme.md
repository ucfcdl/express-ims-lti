# express-ims-lti

[![Build Status](https://travis-ci.org/Tape/express-ims-lti.svg?branch=master)](https://travis-ci.org/Tape/express-ims-lti)

This module provides a way to use the [ims-lti](https://github.com/omsmith/ims-lti) module with Express. It is capable of detecting LTI login requests and intelligently restoring an LTI provider instance from an Express session automatically.

## Usage

Usage for the module is fairly straightfoward.

```js
var ltiMiddleware = require("express-ims-lti");
var lti = require('ims-lti')
// Optional
// var redisClient = require('redis').createClient();

// ... Construct your application ...

app.use(ltiMiddleware({
  // You must use either the credentials option or the consumer_key and
  // consumer_secret. The credentials option a function that accepts a key and
  // a callback to perform an asynchronous operation to fetch the secret.
  credentials: function (key, callback) {
    // use this function to dynamically look up a secret based on the key
    // allowing you to have multiple key/secret pairs
    // `this` is a reference to the express request object.
    // The first parameter is an error (null if there is none).
    // 2nd is the consumer key, we'll just pass the key we got back
    // 3rd is the consumer secret that matches this key, used to validate the OAuth signature
    callback(null, key, 'dynamic_secret_value_for_this_key');
  },

  consumer_key: "key",       // Required if not using credentials key shown above.
  consumer_secret: "secret", // Required if not using credentials key shown above.

  // Optional Nonce Storage
  // `store` expects an instance of a lti.stores.NonceStore object
  // defaults to `new lti.stores.MemoryStore()`
  // Examples:
  // `store: new MyCustomNonceStore()`
  // `store: new lti.stores.RedisStore('consumer_key', redisClient)`
  store: new lti.stores.MemoryStore()
}));
```
