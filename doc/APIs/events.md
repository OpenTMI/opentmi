# Event API

**NOTE** Following API's require authentication token to work.

## Find Events
Find Events. Data schema available [here](../app/models/event.js)

*  **URL**

   /api/v0/events

* **Method**

  `GET`

* **Success Response:**

  **Code:** 200

  **Content:**
    ```json
    [{
        "_id" : "5a89c4121a6d6e068a08c60e"),
        "cre" : {
            "date" : "2018-02-18T18:21:06.865Z"
        },
        "priority" : {
            "level" : "info",
            "facility" : "user"
        }
    }]
    ```

* **Error Response:**

  * **Code:** 401 UNAUTHORIZED

    **Content:**
    ```json
    { "message": "No authorization token was found" }
    ```

* **Sample Call:**
	`curl -H "Authorization: Bearer mytoken123" http://localhost:3000/api/v0/events`


**Notes:**
  You can use filter results by using url parameters. E.g. <api>/events?priority.level=info

## Get single event
 Returns single Event.

* **URL**

  /api/v0/event/:event

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
      "priority" : {
        "level" : "info",
        "facility" : "user"
      }
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
    {"error": "No event found by id"}
    ```


## Get events based on resource id

* **URL**

 `/api/v0/resources/:Resource/events`


* **Method:**

  `GET`

Result same as calling GET `/api/v0/events?ref.resource=:Resource`

## Calculate basic statistics from events

**NOTE:** This is alpha API. Might contains miscalculations.

* **URL**

    `/api/v0/resources/:Resource/statistics`

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200

    **Content:**

    ```
      allocations: {
        count: 0,
        time: 0
      },
      maintenance: {
        count: 0,
        time: 0
      },
      flashed: {
        count: 0,
        failCount: 0
      },
      dates: []
    ```

## Calculate resource utilization based on allocation and release events

**NOTE:** This is experimental API. Might contains miscalculations.

* **URL**

    `/api/v0/resources/:Resource/utilization`

* **Method:**

  `GET`

* **Success Response:**

  * **Code:** 200

    **Content:**

    ```
      allocations: {
        utilization: 0
      },
      maintenance: {
        utilization: 0
      },
      flashed: {
        utilization: 0
      }
    ```
