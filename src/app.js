const path = require("path");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const morgan = require("morgan");
const express = require("express");
const fs = require("fs");
const compression = require("compression");
const minify = require("express-minify");

const app = express();

app.set("views", path.join(__dirname, "public"));

/**
 * Sets logging for debugging & control.
 *
 * We do not log requests to `/myip`.
 *
 * @method midware-morgan
 */
app.use(morgan(":date[clf] :remote-addr :method :status :response-time ms - :url :res[content-length]", {
  skip: (req, res) => {
    var skipThis = {
      "/myip": 1,
    };
    return skipThis[req.path] ? true : false;
  }
}));

/**
 * Sets up body parsing, accepting the `application/json` and `application/x-www-form-urlencoded`
 * content types (respectively, JSON and URL encoded contents).
 *
 * This adds the object **`req.body`** containing data in the body of the POST request.
 *
 * @method midware-bodyParser
 */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/**
 * Compresses the HTTP responses.
 * We don't compress some file formats because they are already compressed, and further compression results in
 *   a waste of computational power or even an elongation of the data transferral time.
 *
 * @method midware-compression
 */
app.use(compression({
  filter: (req, res) => {
    var url = req.url;
    var exts = [".jpg", ".png"];

    for(var ext in exts){
      if(url.endsWith(ext))
        return false;
    }

    return compression.filter(req, res);
  }
}));

/**
 * Minifies files.
 *
 * This midware must come after `compression` and before `express.static`.
 *
 * @method midware-minify
 */
app.use(minify({
  cache: false,
  uglifyJsModule: null,
  errorHandler: (err, callback) => {
    console.log(err);
    if(err.stage === "compile"){
      callback(err.error, JSON.stringify(err.error));
      return;
    }
    callback(err.error, err.body);
  },
  jsMatch: /javascript/,
  cssMatch: /css/, // Matches content-types containing 'css'
  jsonMatch: /json/,
}));

/**
 * Sets up cookie-based user sessions.
 *
 * This adds the object **`req.session`** in which an specific user's session data is stored.
 * New session data can be created by adding objects to this `req.session` object.
 *
 * The `name` parameter controls what object is created within `req`. Prefer "session".
 *
 * @method midware-cookieSession
 */
app.use(cookieSession({
  name: "session", // Controls what object is created in `req`
  secret: "not very secret, uh?",
  maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years
}));

/**
 * Sets up static serving of the /public folder.
 *
 * @method midware-express-static
 */
app.use(express.static(path.resolve("./public"), {
  maxAge: 31557600000 // Enable caching
}));

// Handle page not found
app.get("*", (req, res) => {
  // 404: Not Found
  res.status(404);
  res.send("<h1>Page not found.</h1>");
});

// Handle errors
app.use((err, req, res, next) => {
  // 500: Internal Server Error
  res.status(500);
  res.send("<h1>Error!</h1>");
  console.log(err.stack);
});

// Serve HTTP
const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port} (HTTP)`);
