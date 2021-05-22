"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token, adminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);


/************************************** POST /companies */

describe("POST /jobs", function () {
  test("ok for admins", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
            company_handle:'c1',
            title: 'Manager',
            salary: 5,
            equity: 0.1
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
          id: expect.any(Number),
          title: 'Manager',
          salary: 5,
          equity: "0.1",
          company_handle: 'c1'
      }
    });
    });

    test("not admin reject post", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                company_handle:'c2',
                title: 'Manager',
                salary: 5,
                equity: 0.1
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
        });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          salary: 100
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
            company_handle:'c2',
            title: 'Manager',
            salary: '10',
            equity: 0.1
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** GET /companies */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title:'Intern Dev',
                salary:5000,
                equity: "0.1",
                company_handle: 'c1'
            },
            {
                title:'Software Engineer',
                salary:10000,
                equity: "0.5",
                company_handle: 'c1'
            },
          ],
    });
  });

  test("one filtered jobs",async function(){
    const resp = await request(app).get("/jobs?minSalary=1000");
    expect(resp.body).toEqual({
        jobs:
            [
                {
                    id: expect.any(Number),
                    title:'Software Engineer',
                    salary:10000,
                    equity: "0.5",
                    company_handle: 'c1'
                },
              {
                  id: expect.any(Number),
                  title:'Intern Dev',
                  salary:5000,
                  equity: "0.1",
                  company_handle: 'c1'
              },
            ],
      });
  })

  test("two filtered jobs",async function(){
    const resp = await request(app).get("/jobs?minSalary=1000&title=engineer");
    expect(resp.body).toEqual({
        jobs:
            [
                {
                    id: expect.any(Number),
                    title:'Software Engineer',
                    salary:10000,
                    equity: "0.5",
                    company_handle: 'c1'
                },
            ],
      });
  });

  test("invalid filter str should be int", async function () {
    const resp = await request(app).get(`/jobs?minSalary=nope`);
    expect(resp.statusCode).toEqual(400);
  });})

// /************************************** GET /companies/:handle */

describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title:'Software Engineer',
        salary:10000,
        equity: "0.5",
        company_handle: 'c1',
        company: {
            handle:'c1',
            name: 'C1',
            description: 'Desc1',
            num_employees: 1,
            logo_url: 'http://c1.img'
        }
        },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/1000`);
    expect(resp.statusCode).toEqual(404);
  });
});

// /************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          title: "Electrical Engineer",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title:'Electrical Engineer',
        salary:10000,
        equity: "0.5",
        company_handle: 'c1'
    },
    });
  });

  test("unauth for non-admin", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          title: "new job",
        }).set("authorization", `Bearer ${u1Token}`);;
    expect(resp.statusCode).toEqual(401);
  });

  test("job not found", async function () {
    const resp = await request(app)
        .patch(`/jobs/12346`)
        .send({
          title: "new job",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          handle: "c1-new",
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .patch(`/jobs/${jobId}`)
        .send({
          salary:'nope',
        })
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

// /************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admins", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .delete(`/jobs/${jobId}`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.body).toEqual({ deleted: `${jobId}`});
  });

  test("unauth for non-admin", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    const resp = await request(app)
        .delete(`/jobs/${jobId}`).set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/123456`)
        .set("authorization", `Bearer ${adminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
