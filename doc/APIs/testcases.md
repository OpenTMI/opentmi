# Testcase API

## Get All Testcases
Returns json data about a single testcase.

* #### URL
  api/v0/testcases/

* #### Method:
  `GET`

* #### Success Response:
  * **Code:** 200  
    **Content:** 
    ```json
        [
          {
            "tcid": "Testcase-1000",
            "ver": {
              "cur": 0
            },
            "compatible": {
              "field": {
                "yes": false
              },
              "automation": {
                "yes": false
              },
              "hardware": {
                "target": [],
                "yes": true
              },
              "simulation": {
                "yes": true
              }
            },
            "history": {
              "durationAvg": 60
            },
            "status": {
              "value": "released"
            },
            "specification": {
              "inline": ""
            },
            "files": [],
            "requirements": {
              "node": {
                "count": 1
              }
            },
            "execution": {
              "estimation": {
                "passrate": 0,
                "duration": 95
              },
              "skip": {
                "value": false
              }
            },
            "other_info": {
              "purpose": "dummy",
              "type": "regression",
              "comments": [],
              "tags": [],
              "keywords": [],
              "features": [],
              "components": [
                "ALU2"
              ],
              "sut": [],
              "layer": "unknown",
              "title": "Example case"
            },
            "owner": {
              "group": "",
              "name": "nobody"
            },
            "mod": {
              "timestamp": "2016-12-19T19:39:11.689Z"
            },
            "cre": {
              "time": "2016-12-19T19:39:11.689Z"
            },
            "archive": {
              "value": false
            },
            "id": "5858375fbee7d73c703c5e16"
          },
          ...
        ]
    ```
 
* ##### Error Response:
  * **Code:** 300 MULTIPLE CHOICES  
    **Content:** 
    ```json
        { "error": "Something weird happened" }
    ```

* ##### Sample Call:
  `curl http://localhost:3000/api/v0/testcases`
  
* ##### Notes:
  _..._

## Post a new testcase
Creates a new testcase document to the database

* #### URL
  api/v0/testcases/

* #### Method:
  `POST`

* ##### URL Params
  None

* #### Data Params
  * **Required**

    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>tcid</td>
          <td>(string)</td>
          <td>Min Length: 4</td>
        </tr>
      </tbody> 
    </table>
    
  * **Optional**  
    <table id="base">
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
         <tr>
          <td>archive</td>
          <td>(<a href="#archive">object</a>)</td>
          <td></td>
        </tr>
          <tr>
          <td>cre</td>
          <td>(<a href="#cre">object</a>)</td>
          <td></td>
        </tr>
          <tr>
          <td>mod</td>
          <td>(<a href="#mod">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>owner</td>
          <td>(<a href="#owner">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>other_info</td>
          <td>(<a href="#other_info">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>execution</td>
          <td>(<a href="#execution">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>requirements</td>
          <td>(<a href="#requirements">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>files</td>
          <td>[ <a href="#file">object</a> ]</td>
          <td></td>
        </tr>
        <tr>
          <td>specification</td>
          <td>(<a href="#specification">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>status</td>
          <td>(<a href="#status">object</a>)</td>
          <td></td>
        </tr>
       <tr>
          <td>history</td>
          <td>(<a href="#history">object</a>)</td>
          <td></td>
        </tr>
       <tr>
          <td>compatible</td>
          <td>(<a href="#compatible">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>ver</td>
          <td>(<a href="#ver">object</a>)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="archive">Archive</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>value</td>
          <td>(boolean)</td>
          <td>title: "Archived"<br>default: false</td>
        </tr>
        <tr>
          <td>time</td>
          <td>(Date)</td>
          <td></td>
        </tr>
        <tr>
          <td>user</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="cre">Credentials</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>time</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>user</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="mod">Modified</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>timestamp</td>
          <td>(string)</td>
          <td>default: Date.now</td>
        </tr>
        <tr>
          <td>user</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="owner">Owner</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>name</td>
          <td>(string)</td>
          <td>title: "User"
            <br>default: ""
          </td>
        </tr>
        <tr>
          <td>group</td>
          <td>(string)</td>
          <td>title: "Group"
            <br>default: ""
          </td>
        </tr>
        <tr>
          <td>site</td>
          <td>(string)</td>
          <td>title: "Site"</td>
        </tr>
      </tbody>
    </table>

    <strong id="other_info">Other info</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>title</td>
          <td>(string)</td>
          <td>default: ""<br>title: "Title"</td>
        </tr>
        <tr>
          <td>type</td>
          <td>(string)</td>
          <td>enum: [
            <br>"installation", "compatibility", "smoke",
            <br>"regression", "acceptance", "alpha",
            <br>"beta", "stability", "functional",
            <br>"destructive", "performance", "reliability"
            <br>]
          </td>
        </tr>
        <tr>
          <td>purpose</td>
          <td>(string)</td>
          <td>title: "Purpose"</td>
        </tr>
        <tr>
          <td>description</td>
          <td>(string)</td>
          <td>title: "Description"</td>
        </tr>
        <tr>
          <td>layer</td>
          <td>(string)</td>
          <td>title: "Layer"<br>default: "unknown"<br>enum: [
            <br>"L1",
            <br>"L2",
            <br>"L3",
            <br>"unknown"
            <br>]
          </td>
        </tr>
        <tr>
          <td>sut</td>
          <td>[ <a href="#sut">object</a> ]</td>
          <td></td>
        </tr>
        <tr>
          <td>components</td>
          <td>[ string ]</td>
          <td>title: "Component"</td>
        </tr>
        <tr>
          <td>features</td>
          <td>[ string ]</td>
          <td>title: "Feature"</td>
        </tr>
        <tr>
          <td>keywords</td>
          <td>[ string ]</td>
          <td>title: "Keyword"</td>
        </tr>
        <tr>
          <td>tags</td>
          <td>[ <a href="#tag">object</a> ]</td>
          <td></td>
        </tr>
        <tr>
          <td>comments</td>
          <td>[ <a href="#comment">object</a> ]</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="sut">Software Under Test</strong>
    <p>used by: <a href="#other_info">Other info</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>name</td>
          <td>(string)</td>
          <td>required: true</td>
        </tr>
        <tr>
          <td>supported_versions</td>
          <td>(string)</td>
          <td>match: /[*\d]{1,}\.?[*\d]{1,}?\.?[*\d]{1,}?/
            <br>default: "*"</td>
        </tr>
        <tr>
          <td>features</td>
          <td>[ <a href="#feature">object</a> ]</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="feature">Feature</strong>
    <p>used by: <a href="#sut">Software Under Test</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>name</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>SubFeas</td>
          <td>[ any ]</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="tag">Tag</strong>
    <p>used by: <a href="#other_info">Other info</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>key</td>
          <td>(string)</td>
          <td>title: "Key"<br>required: true</td>
        </tr>
        <tr>
          <td>value</td>
          <td>(string)</td>
          <td>title: "Value"</td>
        </tr>
      </tbody>
    </table>

    <strong id="comment">Comment</strong>
    <p>used by: <a href="#other_info">Other info</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>comment</td>
          <td>(string)</td>
          <td>title: "Comment"</td>
        </tr>
        <tr>
          <td>timestamp</td>
          <td>(Date)</td>
          <td>default: Date.now</td>
        </tr>
        <tr>
          <td>user</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="execution">Execution</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>skip</td>
          <td>(<a href="#skip">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>estimation</td>
          <td>(<a href="#estimation">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>note</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="skip">Skip</strong>
    <p>used by: <a href="#execution">Execution</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>value</td>
          <td>(boolean)</td>
          <td>default: false<br>index: true</td>
        </tr>
        <tr>
          <td>reason</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>time</td>
          <td>(Date)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="estimation">Estimation</strong>
    <p>used by: <a href="#execution">Execution</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>passrate</td>
          <td>(Number)</td>
          <td>default: 0</td>
        </tr>
        <tr>
          <td>duration</td>
          <td>(Number)</td>
          <td>default: 0</td>
        </tr>
      </tbody>
    </table>

    <strong id="requirements">Requirements</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>node</td>
          <td>(<a href="#node">object</a>)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="node">Node</strong>
    <p>used by: <a href="#requirements">Requirements</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>count</td>
          <td>(Number)</td>
          <td>default: 1</td>
        </tr>
      </tbody>
    </table>

    <strong id="file">File</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>filename</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>ref</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>size</td>
          <td>(Number)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="specification">Specification</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>inline</td>
          <td>(string)</td>
          <td>default: ""</td>
        </tr>
        <tr>
          <td>href</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="status">Status</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>value</td>
          <td>(string)</td>
          <td>title: "Status"
            <br>default: "unknown"
            <br>index: true
            <br>enum: [
            <br>"unknown",
            <br>"released",
            <br>"development",
            <br>"maintenance",
            <br>"broken"
            <br>]
          </td>
        </tr>
        <tr>
          <td>verification</td>
          <td>(<a href="#verification">object</a>)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="verification">Verification</strong>
    <p>used by: <a href="#status">Status</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>value</td>
          <td>(boolean)</td>
          <td></td>
        </tr>
        <tr>
          <td>user</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>time</td>
          <td>(Date)</td>
          <td></td>
        </tr>
        <tr>
          <td>ss_resource</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>dut_resource</td>
          <td>(string)</td>
          <td></td>
        </tr>
        <tr>
          <td>dut_build</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="history">History</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>durationAvg</td>
          <td>(Number)</td>
          <td>default: 60</td>
        </tr>
      </tbody>
    </table>

    <strong id="compatible">Compatible</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table id=compatible>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>simulation</td>
          <td>(<a href="#simulation">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>hardware</td>
          <td>(<a href="#hardware">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>automation</td>
          <td>(<a href="#automation">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>field</td>
          <td>(<a href="#field">object</a>)</td>
          <td></td>
        </tr>
      </tbody> 
    </table>

    <strong id="simulation">Simulation</strong>
    <p>used by: <a href="#compatible">Compatible</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>yes</td>
          <td>(boolean)</td>
          <td>default: true</td>
        </tr>
      </tbody>
    </table>

    <strong id="hardware">Hardware</strong>
    <p>used by: <a href="#compatible">Compatible</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>target</td>
          <td>[ string ]</td>
          <td>enum: [ "K64F" ]</td>
        </tr>
        <tr>
          <td>yes</td>
          <td>(boolean)</td>
          <td>default: true</td>
        </tr>
      </tbody>
    </table>

    <strong id="automation">Automation</strong>
    <p>used by: <a href="#compatible">Compatible</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>yes</td>
          <td>(boolean)</td>
          <td>default: false<br>index: true</td>
        </tr>
        <tr>
          <td>system</td>
          <td>(string)</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <strong id="field">Field</strong>
    <p>used by: <a href="#compatible">Compatible</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>yes</td>
          <td>(boolean)
          <td>default: false</td>
        </tr>
      </tbody> 
    </table>

    <strong id="ver">Version</strong>
    <p>used by: <a href="#base">Base object</a></p>
    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>cur</td>
          <td>(Number)</td>
          <td>default: 0</td>
        </tr>
        <tr>
          <td>prev</td>
          <td>(ObjectId)</td>
          <td>ref: Testcase</td>
        </tr>
        <tr>
          <td>next</td>
          <td>(ObjectId)</td>
          <td>ref: Testcase</td>
        </tr>
      </tbody>
    </table>

* #### Success Response:
  * **Code:** 200  
    **Content:** 
    ```json
    {
      "tcid": "Testcase-1000",
      "ver": {
        "cur": 0
      },
      "compatible": {
        "field": {
          "yes": false
        },
        "automation": {
          "yes": false
        },
        "hardware": {
          "target": [],
          "yes": true
        },
        "simulation": {
          "yes": true
        }
      },
      "history": {
        "durationAvg": 60
      },
      "status": {
        "value": "released"
      },
      "specification": {
        "inline": ""
      },
      "files": [],
      "requirements": {
        "node": {
          "count": 1
        }
      },
      "execution": {
        "estimation": {
          "passrate": 0,
          "duration": 95
        },
        "skip": {
          "value": false
        }
      },
      "other_info": {
        "purpose": "dummy",
        "type": "regression",
        "comments": [],
        "tags": [],
        "keywords": [],
        "features": [],
        "components": [
          "ALU2"
        ],
        "sut": [],
        "layer": "unknown",
        "title": "Example case"
      },
      "owner": {
        "group": "",
        "name": "nobody"
      },
      "mod": {
        "timestamp": "2016-12-19T19:39:11.689Z"
      },
      "cre": {
        "time": "2016-12-19T19:39:11.689Z"
      },
      "archive": {
        "value": false
      },
      "id": "5858375fbee7d73c703c5e16"
    }
    ```

* #### Error Response:
  * **Code:** 400 BAD REQUEST  
    **Content:** 
    ```json
    { "error": "Something weird happened" }
    ```

* #### Sample Call:
  _..._
  
* #### Notes:
  _..._
  
## Upsert a Testcase
Identical to post but updates existing testcase if one with the provided id already exists  


* #### URL
  api/v0/testcases/

* #### Method:
  `PUT`

* ##### URL Params
  None

* #### Data Params
  Same as [POST](#Post-a-new-testcase)

* #### Success Response:  
  Same as [POST](#Post-a-new-testcase)

* #### Error Response:
  * **Code:** 400 BAD REQUEST  
    **Content:** 
    ```json
    { "error": "Something weird happened" }
    ```

* #### Sample Call:
  _..._
  
* #### Notes:
  _..._


## Upsert and create result
Performs testcase upsert and also appends a result to the defined testcase

* #### URL
  api/v0/testcases/result

* #### Method:
  `POST`

* ##### URL Params
  None

* #### Data Params
  * **Required**

    <table>
      <thead>
        <tr>
          <th>property</th>
          <th>type</th>
          <th>options</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>testcaseBody</td>
          <td>(<a href="#base">object</a>)</td>
          <td></td>
        </tr>
        <tr>
          <td>resultBody</td>
          <td>(object)<br>Valid result POST body, see result api documentation</td>
          <td></td>
        </tr>
      </tbody> 
    </table>

* #### Success Response:  
  Same as [POST](#Post-a-new-testcase)

* #### Error Response:
  * **Code:** 400 BAD REQUEST  
    **Content:** 
    ```json
    { "error": "Something weird happened" }
    ```

* #### Sample Call:
  _..._
  
* #### Notes:
  _..._
