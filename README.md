# Assignment Announcement — System Testing (Mock Competitive Programming API)

## What you’ll do

You will perform **system testing** on the provided Mock Competitive Programming API. The API implements users, contests, problems, and submissions with JWT-based auth and in-memory storage.

* **Specifications & how to run:** Everything you need (endpoints, behaviors, and run instructions) is in the  **`documentation.md`**.
* **Do not** paste API specs in your report—**refer to `documentation.md`** instead.

## Important context

* This assignment is **supposed to be a system test**.
* There are **intentional faults** in the implementation.
  **Finding, reproducing, and reporting those faults is your target.**

## To test your own project (optional)

* You **may use your own project** as a test target.
* That project must have the following characteristics (at least):
  * User Authentication and Authorization
  * Must return appropriate HTTP status codes (not just 200 and 500)
  * There should be scope to use property of a response in another request
  * Must have api endpoints that take parameters and return data
  * There should be at least one api endpoint that returns a list of items
  * Must have at least one endpoint that accepts a POST and at least one PUT request with a body

## Collaboration policy

* You **may share “how to do something”** (e.g., how to set up, how to use a tool, how to structure a test plan) with other teams.
* You **must not share your test cases, test data, or full test ideas** with other teams.
* **Sharing test ideas** (beyond generic “how-to”) **may result in a penalty** for all involved teams.

## Deliverables (one PDF + supporting evidence)

Include a single PDF report plus an evidence folder:

1. **Test Plan**

   * For each endpoint or behavior:
        - Write the input/ parameter choices. (read the class slides to understand how to do this)
        - Describe the expected output.

2. **Test Cases**

   * Present as a table with: **ID, Title, Pre-conditions, Steps, Expected, Actual, Status, Evidence link**
   * Cover: happy paths, error handling, auth, role/permission checks, time-based logic, data consistency (IDs vs usernames), and sorting/filters.

3. **Defect Reports**

   * For each defect: **ID, Title, Severity (Blocker/Major/Minor), Steps to Reproduce, Expected, Actual, Logs/Responses, Evidence**
   * Group similar defects; indicate duplicates or cascades where relevant.

4. **Risk & Recommendations (≤1 page)**

   * Top risks you see in the current system
   * High-value fixes or hardening suggestions

### Evidence folder

* Include **screenshots**, **raw JSON responses**, and **logs** referenced in your report (organized and named by test/defect ID).

## Bonus (optional)

* If your team creates a **general-purpose testing tool** (e.g., a reusable harness, fuzzing or property-based tester, auth/session scenario runner)—**beyond a basic fetch-and-match script**—you **may earn bonus credit**.

  * Provide the link (public repository) to the tool in your report.

## Submission format

* Submit a single archive named in the elms: **`<StudentID1>_<StudentID2>_SystemTesting.zip`**

  * `Report.pdf`
  * `evidence/` (screenshots, logs, JSON samples)


## Deadline

* **Week 6 (Wednesday)** — **will not be extended**.
  Submit before 23:59 (local time) to avoid late penalties.

## Reminders

* No need modify the code to “fix” issues—**report them**.
* Keep your findings reproducible and tied to evidence.
* **All technical details about endpoints & running** are in **`documentation.md`**.
