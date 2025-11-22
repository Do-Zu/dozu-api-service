# Class Topic Comment Service Unit Test Documentation

This document outlines the test cases for the Class Topic Comment Service, formatted to assist in creating the Excel test report.

## 1. Get Comment By ID

**Function Name:** getCommentById
**API Endpoint:** POST /api/v1/classes/:classId/topics/:topicId/comments/single-comment
**Description:** Retrieves a comment by its ID.

| Test Case ID | Condition / Precondition | Input (Params)   | Return (Expected) |
| :----------- | :----------------------- | :--------------- | :---------------- |
| UTCID 01     | Comment exists           | `commentId`: 1   | Comment object    |
| UTCID 02     | Comment does not exist   | `commentId`: 999 | `undefined`       |

## 2. Get Comments By Filters

**Function Name:** getCommentsByFilters
**API Endpoint:** POST /api/v1/classes/:classId/topics/:topicId/comments/node-comments (when includeReplies=false) OR POST /api/v1/classes/:classId/topics/:topicId/comments/replies
**Description:** Retrieves a list of comments based on provided filters.

| Test Case ID | Condition / Precondition | Input (Params)                        | Return (Expected) |
| :----------- | :----------------------- | :------------------------------------ | :---------------- |
| UTCID 01     | Valid filters            | `nodeId`: "1", `page`: 1, `limit`: 10 | Array of comments |

## 3. Get Comments With Replies

**Function Name:** getCommentsWithReplies
**API Endpoint:** POST /api/v1/classes/:classId/topics/:topicId/comments/node-comments (when includeReplies=true)
**Description:** Retrieves root comments for a node and attaches their replies.

| Test Case ID | Condition / Precondition   | Input (Params)                            | Return (Expected)                                   |
| :----------- | :------------------------- | :---------------------------------------- | :-------------------------------------------------- |
| UTCID 01     | Comments and replies exist | `nodeId`: "node-1", `typeNode`: "mindmap" | Array of comments with `replies` property populated |

## 4. Create Comment

**Function Name:** createComment
**API Endpoint:** POST /api/v1/classes/:classId/topics/:topicId/comments/add
**Description:** Creates a new comment or reply.

| Test Case ID | Condition / Precondition | Input (Params)                              | Return (Expected)                                               |
| :----------- | :----------------------- | :------------------------------------------ | :-------------------------------------------------------------- |
| UTCID 01     | Create root comment      | `content`: "root", `parentCmtId`: undefined | Created comment object (level 0)                                |
| UTCID 02     | Create reply comment     | `content`: "reply", `parentCmtId`: 1        | Created comment object (level 1), increments parent reply count |
| UTCID 03     | Parent comment not found | `parentCmtId`: 999                          | Throws `NotFoundError`                                          |
| UTCID 04     | Database error           | Valid input                                 | Throws `DatabaseError`                                          |

## 5. Update Comment

**Function Name:** updateComment
**API Endpoint:** N/A (Route not exposed)
**Description:** Updates an existing comment's content.

| Test Case ID | Condition / Precondition      | Input (Params)                                    | Return (Expected)      |
| :----------- | :---------------------------- | :------------------------------------------------ | :--------------------- |
| UTCID 01     | Valid update (User is author) | `commentId`: 1, `userId`: 1, `content`: "updated" | Updated comment object |
| UTCID 02     | Comment not found             | `commentId`: 999                                  | Throws `NotFoundError` |
| UTCID 03     | User is not author            | `commentId`: 1, `userId`: 2                       | Throws `BadRequest`    |

## 6. Delete Comment

**Function Name:** deleteComment
**API Endpoint:** N/A (Route not exposed)
**Description:** Soft deletes a comment.

| Test Case ID | Condition / Precondition              | Input (Params)              | Return (Expected)                             |
| :----------- | :------------------------------------ | :-------------------------- | :-------------------------------------------- |
| UTCID 01     | Delete root comment (User is author)  | `commentId`: 1, `userId`: 1 | Success (void)                                |
| UTCID 02     | Delete reply comment (User is author) | `commentId`: 2, `userId`: 1 | Success (void), decrements parent reply count |
| UTCID 03     | Comment not found                     | `commentId`: 999            | Throws `NotFoundError`                        |
| UTCID 04     | User is not author                    | `commentId`: 1, `userId`: 2 | Throws `BadRequest`                           |

## 7. Get Comments By Author

**Function Name:** getCommentsByAuthor
**API Endpoint:** N/A (Route not exposed)
**Description:** Retrieves all comments created by a specific user.

| Test Case ID | Condition / Precondition | Input (Params) | Return (Expected) |
| :----------- | :----------------------- | :------------- | :---------------- |
| UTCID 01     | User has comments        | `userId`: 1    | Array of comments |
