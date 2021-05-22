"use strict";

const {
  NotFoundError,
  BadRequestError,
} = require("../expressError");
const db = require("../db.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** findAll */

describe("findAll", function () {
  test("works", async function () {
    const users = await Job.findAll();
    expect(users).toEqual([
      {
        title: "Software Engineer",
        salary: 5000,
        equity: "0.1",
        company_handle:"c1"
      },
    ]);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    let jobGet = await Job.get(jobId);
    expect(jobGet).toEqual({
        id: jobId,
        title: "Software Engineer",
        salary: 5000,
        equity: "0.1",
        company_handle:"c1",
        company: {
         description: "Desc1",
         handle: "c1",
         logo_url: "http://c1.img",
         name: "C1",
         num_employees: 1,
        }
      });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(123456);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  test("works", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    let jobUpdate = await Job.update(jobId, {title:"Manager"});
    expect(jobUpdate).toEqual({
      id: jobId,
      title: "Manager",
      salary: 5000,
      equity: "0.1",
      company_handle:"c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(123456, {
        title: "Asst Manager",
      });
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
})

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
    let jobId = job.rows[0].id
    await Job.remove(jobId);
    const res = await db.query(
        `SELECT * FROM jobs WHERE id=${jobId}`);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(123456);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

describe("filter", function () {
    test("works", async function () {
      let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
      let jobId = job.rows[0].id
      let jobFiltered = await Job.jobFilter({title:"Software Engineer",minSalary:1});
      expect(jobFiltered).toEqual([{
        title: "Software Engineer",
        salary: 5000,
        equity: "0.1",
        company_handle:"c1",
        id: jobId
      }]);
    });
    test("one filter", async function () {
      let job = await db.query(`SELECT id FROM jobs where title='Software Engineer'`)
      let jobId = job.rows[0].id
      let jobFiltered = await Job.jobFilter({minSalary:1});
      expect(jobFiltered).toEqual([{
        title: "Software Engineer",
        salary: 5000,
        equity: "0.1",
        company_handle:"c1",
        id:jobId
      }]);
    });
    test("no results", async function () {
      try {
        await Job.jobFilter({title:"nope"});
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
  });