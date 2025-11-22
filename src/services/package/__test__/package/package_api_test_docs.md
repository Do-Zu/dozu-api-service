# Package Service API Unit Test Documentation

This document outlines the test cases for the Package Service APIs, formatted to assist in creating the Excel test report.

## 1. Create New Package

**Function Name:** createNewPackage
**API Endpoint:** POST /api/v1/package/new

| Test Case ID | Condition / Precondition                         | Input (Body)                             | Return (Expected)                          |
| :----------- | :----------------------------------------------- | :--------------------------------------- | :----------------------------------------- |
| UTCID 01     | User is authenticated, valid payload             | `title`: "New Package", `parentId`: null | 201 Created, JSON with new package details |
| UTCID 02     | User is authenticated, valid payload with parent | `title`: "Sub Package", `parentId`: 1    | 201 Created, JSON with new package details |
| UTCID 03     | User is authenticated, missing title             | `title`: "", `parentId`: null            | 400 Bad Request (Validation Error)         |
| UTCID 04     | User is authenticated, invalid parentId          | `title`: "Package", `parentId`: -1       | 400 Bad Request (Validation Error)         |
| UTCID 05     | User not authenticated                           | Any                                      | 401 Unauthorized                           |

## 2. Get Packages

**Function Name:** getPackages
**API Endpoint:** GET /api/v1/package

| Test Case ID | Condition / Precondition              | Input (Query)                           | Return (Expected)                             |
| :----------- | :------------------------------------ | :-------------------------------------- | :-------------------------------------------- |
| UTCID 01     | User is authenticated, default params | `limit`: undefined, `offset`: undefined | 200 OK, List of packages (default limit 20)   |
| UTCID 02     | User is authenticated, custom params  | `limit`: 10, `offset`: 5                | 200 OK, List of packages (limit 10, offset 5) |
| UTCID 03     | User not authenticated                | Any                                     | 401 Unauthorized                              |

## 3. Update Package

**Function Name:** updatePackage
**API Endpoint:** PUT /api/v1/package

| Test Case ID | Condition / Precondition                 | Input (Body)                               | Return (Expected)                             |
| :----------- | :--------------------------------------- | :----------------------------------------- | :-------------------------------------------- |
| UTCID 01     | User is authenticated, valid update      | `packageId`: 1, `title`: "Updated Title"   | 200 OK, Updated package details               |
| UTCID 02     | User is authenticated, package not found | `packageId`: 999, `title`: "Updated Title" | 500 Internal Server Error (or 404 if handled) |
| UTCID 03     | User is authenticated, invalid title     | `packageId`: 1, `title`: ""                | 400 Bad Request                               |
| UTCID 04     | User not authenticated                   | Any                                        | 401 Unauthorized                              |

## 4. Delete Package

**Function Name:** deletePackage
**API Endpoint:** DELETE /api/v1/package

| Test Case ID | Condition / Precondition                    | Input (Body)     | Return (Expected)                       |
| :----------- | :------------------------------------------ | :--------------- | :-------------------------------------- |
| UTCID 01     | User is authenticated, existing package     | `packageId`: 1   | 200 OK, "Package Delete!" message       |
| UTCID 02     | User is authenticated, non-existing package | `packageId`: 999 | 200 OK (Idempotent or handled silently) |
| UTCID 03     | User not authenticated                      | Any              | 401 Unauthorized                        |

## 5. Get Topics Belonging to Package

**Function Name:** getTopicBelongPackage
**API Endpoint:** POST /api/v1/package/topic-package

| Test Case ID | Condition / Precondition                       | Input (Body)     | Return (Expected)      |
| :----------- | :--------------------------------------------- | :--------------- | :--------------------- |
| UTCID 01     | User is authenticated, valid packageId         | `packageId`: 1   | 200 OK, List of topics |
| UTCID 02     | User is authenticated, package not found/empty | `packageId`: 999 | 404 Not Found          |
| UTCID 03     | User not authenticated                         | Any              | 401 Unauthorized       |

## 6. Get Unassigned Topics

**Function Name:** getTopicUnAssignedTopic
**API Endpoint:** POST /api/v1/package/topics/unassigned

| Test Case ID | Condition / Precondition               | Input (Body)                             | Return (Expected)                 |
| :----------- | :------------------------------------- | :--------------------------------------- | :-------------------------------- |
| UTCID 01     | User is authenticated, valid params    | `packageId`: 1, `limit`: 10, `offset`: 0 | 200 OK, List of unassigned topics |
| UTCID 02     | User is authenticated, no topics found | `packageId`: 1, `limit`: 10, `offset`: 0 | 404 Not Found                     |
| UTCID 03     | User not authenticated                 | Any                                      | 401 Unauthorized                  |

## 7. Update Topic in Package

**Function Name:** updateTopicInPackage
**API Endpoint:** PUT /api/v1/package/topic/modify

| Test Case ID | Condition / Precondition                     | Input (Body)                     | Return (Expected)                                           |
| :----------- | :------------------------------------------- | :------------------------------- | :---------------------------------------------------------- |
| UTCID 01     | User is authenticated, valid assignment      | `topicId`: 1, `packageId`: 2     | 200 OK, Updated topic details                               |
| UTCID 02     | User is authenticated, invalid topic/package | `topicId`: 999, `packageId`: 999 | 200 OK (Result might be undefined/empty depending on logic) |
| UTCID 03     | User not authenticated                       | Any                              | 401 Unauthorized                                            |

## 8. Remove Topic from Package

**Function Name:** removeTopicInPackage
**API Endpoint:** PUT /api/v1/package/topic/remove

| Test Case ID | Condition / Precondition                    | Input (Body)                 | Return (Expected)              |
| :----------- | :------------------------------------------ | :--------------------------- | :----------------------------- |
| UTCID 01     | User is authenticated, valid removal        | `topicId`: 1, `packageId`: 2 | 200 OK, Removed topic details  |
| UTCID 02     | User is authenticated, topic not in package | `topicId`: 1, `packageId`: 3 | 200 OK (Result might be empty) |
| UTCID 03     | User not authenticated                      | Any                          | 401 Unauthorized               |
