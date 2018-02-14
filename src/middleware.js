const lti = require("ims-lti");
const messageTypes = ['basic-lti-launch-request', 'ContentItemSelectionRequest']

let isObject = arg => typeof arg == "object" && arg !== null

module.exports = userSettings => {
  // warn about required user settings
  if (!userSettings.credentials && (!userSettings.consumer_key || !userSettings.consumer_secret)) {
    throw new Error("A consumer_key and consumer_secret must be present")
  }
  // merge with defaults
  let options = Object.assign({}, {addToSession: true}, userSettings)
  let nonceStore = (options.nonceStore ? options.nonceStore : new lti.Stores.MemoryStore())

  if (!options.credentials) {
    options.credentials = (key, callback) => {
      callback(null, options.consumer_key, options.consumer_secret)
    }
  }

  return (req, res, next) => {
    // Detect if there is a payload that would indicate an LTI launch. If it is
    // present then verify the request, storing the request parameters into the
    // session if valid, and throwing an error if not.
    if (req.method == "POST"
        && isObject(req.body)
        && req.body.lti_message_type
        && messageTypes.includes(req.body.lti_message_type)) {
      return options.credentials.call(req, req.body.oauth_consumer_key, (err, key, secret) => {
        if (err) {
          return next(err)
        }

        req.lti = new lti.Provider(key, secret, nonceStore);

        req.lti.valid_request(req, (err) => {
          if (err) {
            return next(err)
          }

          if(options.addToSession){
            req.session.lti = {
              key:    key,
              secret: secret,
              params: req.body
            }
          }

          next()
        });
      });
    }

    next();
  };
};

module.exports.lti = lti;
