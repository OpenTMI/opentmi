# Resources API

**NOTE** Following API's require authentication token to work.

## Find Resources
Find Events. Data schema available [here](../../app/models/resource.js)

*  **URL**

   /api/v0/resources

* **Method**

  `GET`

* **Success Response:**

  **Code:** 200

  **Content:**
    ```json
    [{
        "_id" : "5a89c4121a6d6e068a08c60e",
        "cre" : {
            "date" : "2018-02-18T18:21:06.865Z"
        },
        ...
    }]
    ```

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED

    **Content:**
    ```json
    { "message": "No authorization token was found" }
    ```

* **Sample Call:**
	`curl -H "Authorization: Bearer mytoken123" http://localhost:3000/api/v0/resources`


**Notes:**
  You can use filter results by using url parameters. E.g. <api>/resources?hw.sn=abc

## Get single resource
 Returns single Resource.

* **URL**

  /api/v0/resources/:resource

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200

    **Content:**
    ```json
    {
      "_id" : "5a89c4121a6d6e068a08c60e"),
      "cre" : {
        "date" : "2018-02-18T18:21:06.865Z"
      },
      ...
    }
    ```

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED
    **Content:**
    ```json
    { "message": "No authorization token was found" }
    ```

  * **Code:** 404 NOT FOUND
    **Content:**
    ```json
    {"error": "No resources found by id"}
    ```


## resource events and utilization based on resource id
see documentation from [here](events.md#get-events-based-on-resource-id)
