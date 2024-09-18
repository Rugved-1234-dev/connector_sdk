const {
  HttpUtils,
  HttpUtils: { request, successResponse, errorResponse },
  STATUS,
} = require("quickwork-adapter-cli-server/http-library");

const app = {
  name: "gmail",
  alias: "gmail",
  description: "App Description",
  version: "1",
  config: { authType: "oauth_2" },
  webhook_verification_required: false,
  internal: false,
  connection: {
    client_id:
      "13262829095-0aji33823e1hf271h36d9ff3pka4nufj.apps.googleusercontent.com",
    client_secret: "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",
    redirect_uri: "https://proxy.quickwork.co.in/gmail/code",
    authorization: {
      type: "oauth_2",
      authorization_url: async (connection) => {
        let scope = [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
          "https://mail.google.com/",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/gmail.readonly",
        ].join(" ");
        let url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${app.connection.client_id}&redirect_uri=${app.connection.redirect_uri}&scope=${scope}&access_type=offline&response_type=code&prompt=consent&state=${connection.id}`;

        return { url: url };
      },
      acquire: async (code, scope, state) => {
        try {
          let body = {
            client_id: app.connection.client_id,
            client_secret: app.connection.client_secret,
            grant_type: "authorization_code",
            code,
            redirect_uri: app.connection.redirect_uri,
          };

          let tokenURL = "https://accounts.google.com/o/oauth2/token";

          let response = await request(
            tokenURL,
            null,
            null,
            HttpUtils.HTTPMethods.POST,
            body,
            HttpUtils.ContentTypes.FORM_URL_ENCODED
          );

          if (response.success == true) {
            let jsonResponse = JSON.parse(response.body);

            let getUrlInfoBaseURL =
              "https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" +
              jsonResponse.access_token;

            let userInfoResponse = await HttpUtils.request(getUrlInfoBaseURL);
            console.log(userInfoResponse, "userInfoResponse");
            if (userInfoResponse.success == true) {
              return HttpUtils.successResponse({
                accessToken: jsonResponse.access_token,
                expires: jsonResponse.expires_in,
                refreshToken: jsonResponse.refresh_token,
                identity: userInfoResponse.body.email,
              });
            } else {
              return HttpUtils.errorResponse(
                userInfoResponse.body,
                userInfoResponse.statusCode
              );
            }
          } else {
            return HttpUtils.errorResponse(response.body, response.statusCode);
          }
        } catch (error) {
          return HttpUtils.errorResponse(error.message);
        }
      },
      refresh: async (connection) => {
        try {
          let url = "https://www.googleapis.com/oauth2/v4/token";
          let body = {
            client_id: app.connection.client_id,
            client_secret: app.connection.client_secret,
            refresh_token: connection.oauthToken.refreshToken,
            grant_type: "refresh_token",
          };

          let response = await HttpUtils.request(
            url,
            null,
            null,
            HttpUtils.HTTPMethods.POST,
            body,
            HttpUtils.ContentTypes.FORM_URL_ENCODED
          );
          console.log(response, "responseRefresh");

          if (response.success == true) {
            let jsonResponse = JSON.parse(response.body);
            let expires = null;
            if (jsonResponse.hasOwnProperty("expires_in"))
              expires = jsonResponse.expires_in;

            return HttpUtils.successResponse({
              accessToken: jsonResponse.access_token,
              expires,
            });
          } else {
            return HttpUtils.errorResponse(response.body, response.statusCode);
          }
        } catch (error) {
          return HttpUtils.errorResponse(error.message);
        }
      },
      refresh_on: [401],
      detect_on: "",
      credentials: (connection) => {
        let headers = {};
        headers[
          "Authorization"
        ] = `Bearer ${connection.oauthToken.accessToken}`;
        return headers;
      },
    },
  },
  actions: {},
  triggers: {
    new_events: {
      description: "New Events",
      hint: "Trigger when a <b>new mail</b> added via <b>Google Gmail</b>",
      type: "poll",

      input_fields: () => [],
    //   execute: async (connection, input, nextPoll) => {
    //     try {
    //         // Ensure nextPoll is initialized to the current timestamp in seconds if undefined
    //         if (!nextPoll) {
    //             nextPoll = Math.floor(new Date().getTime() / 1000);
    //         }
    
    //         // Ensure queryParams is initialized properly depending on the type of nextPoll
    //         let queryParams = {};
    //         if (typeof nextPoll === 'string' && nextPoll.length === 10) {
    //             queryParams = {
    //                 includeSpamTrash: true,
    //                 maxResults: 1,
    //                 nextPageToken: nextPoll,  
    //             };
    //         } else {
    //             queryParams = {
    //                 includeSpamTrash: true,
    //                 maxResults: 1,
    //                 q: `after:${nextPoll}`,  // nextPoll here acts as a timestamp
    //             };
    //         }
    
    //         // Construct the Gmail API URL and headers
    //         const url = `https://gmail.googleapis.com/gmail/v1/users/${connection.identity}/messages`;
    //         const headers = app.connection.authorization.credentials(connection);
    
    //         // Make the request to the Gmail API
    //         const response = await HttpUtils.request(url, headers, queryParams);
    //         console.log(response.body, "response body");
    
    //         // Initialize an empty eventList
    //         let eventList = [];
    
    //         // Check if the response is successful
    //         if (response.success === true) {
    //             if (response.body.messages && response.body.messages.length > 0) {
    //                 // Add messages to eventList
    //                 response.body.messages.forEach((message) => {
    //                     eventList.push(message);
    //                 });
    //                 console.log(response.body.nextPageToken);
    
    //                 let nextPollTime = response.body.nextPageToken || Math.floor(new Date().getTime() / 1000);
    
    //                 return HttpUtils.successResponse({
    //                     message: "Events created successfully",
    //                     events: eventList,
    //                     nextPoll: nextPollTime,  
    //                 });
    //             } else {
              
    //                 let nextPollTime = Math.floor(new Date().getTime() / 1000);
    //                 let nextPollToken = nextPoll || null;
    //                 console.log(nextPollToken, "nextpollToken");
    
    //                 return HttpUtils.successResponse({
    //                     message: "No new events",
    //                     events: eventList,
    //                     nextPoll: nextPollToken || nextPollTime,  // Use token or current timestamp for nextPoll
    //                 });
    //             }
    //         } else {
    //             // Handle error if the request was not successful
    //             return HttpUtils.errorResponse({
    //                 message: "Failed to fetch messages",
    //             });
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         return HttpUtils.errorResponse({
    //             message: "An error occurred while fetching messages",
    //             error: error.message,
    //         });
    //     }
    // },
    execute: async function execute(connection, input, nextPoll) {
      try {
        // Ensure nextPoll is initialized to the current timestamp
        nextPoll = nextPoll || Math.floor(Date.now() / 1000);
        let startTime = Math.floor(Date.now() / 1000);
    
        let queryParams;
        if (typeof nextPoll === 'string' && nextPoll.length === 10) {
          queryParams = {
            includeSpamTrash: true,
            maxResults: 1,
            q: `after:${nextPoll}`,
          };
          
        } else {
          queryParams = {
            includeSpamTrash: true,
            maxResults: 1,
            nextPageToken: nextPoll,

          };
        
        }
    
        const url = `https://gmail.googleapis.com/gmail/v1/users/${connection.identity}/messages`;
        const headers = app.connection.authorization.credentials(connection);
    
        const response = await HttpUtils.request(url, headers, queryParams);
    
        if (response.success) {
          const eventList = [];
          if (response.body.messages && response.body.messages.length > 0) {
            response.body.messages.forEach((message) => eventList.push(message));
             const  nextPageToken = response.body.nextPageToken;

            return HttpUtils.successResponse({
              message: "Events created successfully",
              events: eventList,
              nextPoll: nextPageToken || nextPoll,
            });
          } else {
            const nextPollToken = nextPoll || null;
            return HttpUtils.successResponse({
              message: "No new events",
              events: eventList,
              nextPoll: nextPoll,
            });
          }
        } else {
          return HttpUtils.errorResponse({
            message: "Failed to fetch messages",
            error: response.error, // Assuming response.error contains the error details
          });
        }
      } catch (error) {
        console.error(error);
        return HttpUtils.errorResponse({
          message: "An error occurred while fetching messages",
          error: error.message,
        });
      }
    },
      

      dedup: (message) => {
        return message.id;
      },

      output_fields: () => [],
    },
  },
  test: async (connection) => {
    try {
      let url =
        "https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=" +
        connection.oauthToken.accessToken;

      let response = await HttpUtils.request(url);
      if (response.success == true) {
        return HttpUtils.successResponse(response.body);
      } else {
        return HttpUtils.errorResponse(response.message, response.statusCode);
      }
    } catch (error) {
      return HttpUtils.errorResponse(error.message);
    }
  },
  objectDefinitions: {
    event: [
      {
        key: "id",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Id",
        hintText: "Id",
        helpText: "Id",
      },
      {
        key: "status",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Status",
        hintText: "Status",
        helpText: "Status",
      },
      {
        key: "htmlLink",
        type: "string",
        controlType: "text",
        required: false,
        isExtendedSchema: false,
        name: "Html Link",
        hintText: "Html Link",
        helpText: "Html Link",
      },
      {
        key: "created",
        type: "string",
        controlType: "text",
        required: false,
        isExtendedSchema: false,
        name: "Created",
        hintText: "Created",
        helpText: "Created",
      },
      {
        key: "updated",
        type: "string",
        controlType: "text",
        required: false,
        isExtendedSchema: false,
        name: "Updated",
        hintText: "Updated",
        helpText: "Updated",
      },
      {
        key: "summary",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Summary",
        hintText: "Summary",
        helpText: "Summary",
      },
      {
        key: "description",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Description",
        hintText: "Description",
        helpText: "Description",
      },
      {
        key: "location",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Location",
        hintText: "Location",
        helpText: "Location",
      },
      {
        key: "creator",
        type: "object",
        properties: [
          {
            key: "email",
            required: false,
            isExtendedSchema: false,
            type: "string",
            controlType: "text",
            name: "Email",
            hintText: "Email",
            helpText: "Email",
          },
          {
            key: "self",
            type: "boolean",
            required: false,
            isExtendedSchema: false,
            controlType: "select",
            name: "Self",
            hintText: "Self",
            helpText: "Self",
            pickList: [
              ["Yes", true],
              ["No", false],
            ],
          },
        ],
        required: false,
        isExtendedSchema: false,
        controlType: "text",
        name: "Creator",
        hintText: "Creator",
        helpText: "Creator",
      },
      {
        key: "organizer",
        type: "object",
        properties: [
          {
            key: "email",
            required: false,
            isExtendedSchema: false,
            type: "string",
            controlType: "text",
            name: "Email",
            hintText: "Email",
            helpText: "Email",
          },
          {
            key: "self",
            type: "boolean",
            required: false,
            isExtendedSchema: false,
            controlType: "select",
            name: "Self",
            hintText: "Self",
            helpText: "Self",
            pickList: [
              ["Yes", true],
              ["No", false],
            ],
          },
        ],
        required: false,
        isExtendedSchema: false,
        controlType: "text",
        name: "Organizer",
        hintText: "Organizer",
        helpText: "Organizer",
      },
      {
        key: "start",
        type: "object",
        properties: [
          {
            key: "dateTime",
            type: "string",
            controlType: "datetime",
            required: false,
            isExtendedSchema: false,
            name: "Date Time",
            hintText: "Date Time",
            helpText: "Date Time",
          },
          {
            key: "timeZone",
            type: "string",
            required: false,
            isExtendedSchema: false,
            controlType: "text",
            name: "Time Zone",
            hintText: "Time Zone",
            helpText: "Time Zone",
          },
        ],
        required: false,
        isExtendedSchema: false,
        controlType: "text",
        name: "Start",
        hintText: "Start",
        helpText: "Start",
      },
      {
        key: "end",
        type: "object",
        properties: [
          {
            key: "dateTime",
            type: "string",
            controlType: "datetime",
            required: false,
            isExtendedSchema: false,
            name: "Date Time",
            hintText: "Date Time",
            helpText: "Date Time",
          },
          {
            key: "timeZone",
            type: "string",
            required: false,
            isExtendedSchema: false,
            controlType: "text",
            name: "Time Zone",
            hintText: "Time Zone",
            helpText: "Time Zone",
          },
        ],
        required: false,
        isExtendedSchema: false,
        controlType: "text",
        name: "End",
        hintText: "End",
        helpText: "End",
      },
      {
        key: "kind",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Kind",
        hintText: "Kind",
        helpText: "Kind",
      },
      {
        key: "etag",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Etag",
        hintText: "Etag",
        helpText: "Etag",
      },
      {
        key: "iCalUID",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "I Cal UID",
        hintText: "I Cal UID",
        helpText: "I Cal UID",
      },
      {
        key: "sequence",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Sequence",
        hintText: "Sequence",
        helpText: "Sequence",
      },
      {
        key: "guestsCanModify",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Guests Can Modify",
        hintText: "Guests Can Modify",
        helpText: "Guests Can Modify",
      },
      {
        key: "reminders",
        required: false,
        isExtendedSchema: false,
        type: "string",
        controlType: "text",
        name: "Reminders",
        hintText: "Reminders",
        helpText: "Reminders",
      },
    ],
  },
  pickLists: {
    calendars: async (connection) => {
      try {
        let url =
          app.connection.base_uri() + "/calendar/v3/users/me/calendarList";
        let headers = app.connection.authorization.credentials(connection);
        let response = await HttpUtils.request(url, headers);
        if (response.success == true) {
          let list = response.body.items.map((item) => {
            if (item.hasOwnProperty("primary") && item.primary == true)
              return ["primary", item.id];
            return [item.summary, item.id];
          });

          list = list.filter((item) => {
            if (item[0] == "Contacts" || item[0] == "Holidays in India")
              return false;
            return true;
          });

          return HttpUtils.successResponse(list);
        } else {
          return HttpUtils.errorResponse(response.body, response.statusCode);
        }
      } catch (error) {
        return HttpUtils.errorResponse(error.message);
      }
    },
    events: async (connection, field, pickListParams) => {
      try {
        let url =
          app.connection.base_uri() +
          `/calendar/v3/calendars/${pickListParams.calendarId}/events`;
        let headers = app.connection.authorization.credentials(connection);
        let response = await HttpUtils.request(url, headers);
        if (response.success == true) {
          let list = response.body.items.map((item) => {
            return [`${item.summary} (${item.id})`, item.id];
          });
          return HttpUtils.successResponse(list);
        } else {
          return HttpUtils.errorResponse(response.body, response.statusCode);
        }
      } catch (error) {
        return HttpUtils.errorResponse(error.message);
      }
    },
  },
};

module.exports = app;
