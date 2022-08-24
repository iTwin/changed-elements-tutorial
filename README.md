# Changed Elements API Tutorial Code

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment Variables

Prior to following the tutorial and running the app, you will need to add OIDC client configuration to the variables in the .env file:

```
# Advanced CRA Config: https://create-react-app.dev/docs/advanced-configuration/
SKIP_PREFLIGHT_CHECK=true

# Advanced iModel.js CRA Config: https://github.com/imodeljs/create-react-app/blob/imodeljs/packages/react-scripts/README-imodeljs.md
USE_FAST_SASS=true
USE_FULL_SOURCEMAP=true
TRANSPILE_DEPS=false

# ---- Authorization Client Settings ----
IMJS_AUTH_CLIENT_CLIENT_ID=
IMJS_AUTH_CLIENT_REDIRECT_URI=
IMJS_AUTH_CLIENT_LOGOUT_URI=
IMJS_AUTH_CLIENT_SCOPES =
IMJS_AUTH_AUTHORITY="https://ims.bentley.com"
```

- You can generate a [test client](https://developer.bentley.com/tutorials/web-application-quick-start/#2-register-an-application) to get started.

You should also add a valid iTwinId and iModelId for your user in the this file:

```
# ---- Test ids ----
IMJS_ITWIN_ID = ""
IMJS_IMODEL_ID = ""
```

- For the IMJS_ITWIN_ID variable, you can use the id of one of your existing Projects or Assets. You can obtain their ids via the [Administration REST APIs](https://developer.bentley.com/api-groups/administration/api-reference/).

- For the IMJS_IMODEL_ID variable, use the id of an iModel that belongs to the iTwin that you specified in the IMJS_ITWIN_ID variable. You can obtain iModel ids via the [Data Management REST APIs](https://developer.bentley.com/api-groups/data-management/apis/imodels/operations/get-project-or-asset-imodels/).

- Alternatively, you can [generate a test iModel](https://developer.bentley.com/tutorials/web-application-quick-start/#3-create-an-imodel) to get started without an existing iModel.

- If at any time you wish to change the iModel that you are viewing, you can change the values of the iTwinId or iModelId query parameters in the url (i.e. localhost:3000?iTwinId=myNewItwinId&iModelId=myNewIModelId)

## Available Scripts

In the project directory, you can run:

### `npm install`

Install dependencies

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Next Steps

- [iTwin Viewer options](https://www.npmjs.com/package/@itwin/web-viewer-react)

- [Extending the iTwin Viewer](https://www.itwinjs.org/learning/tutorials/hello-world-viewer/)

- [Using the iTwin Platform](https://developer.bentley.com/)

- [iTwin Developer Program](https://www.youtube.com/playlist?list=PL6YCKeNfXXd_dXq4u9vtSFfsP3OTVcL8N)
