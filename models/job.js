"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const jsonschema = require("jsonschema");
const {validate} = require('jsonschema');
const jobFilterSchema = require("../schemas/jobFilter.json");

class Job {
  static async create({ title,salary,equity,company_handle }) {
    const result = await db.query(
          `INSERT INTO jobs
           (title,salary,equity,company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id,title, salary, equity, company_handle`,
        [
          title,salary,equity,company_handle
        ],
    );
    const job = result.rows[0];

    return job;
  }
  
  static async jobFilter(filters) {
    if (filters.minSalary){
      filters.minSalary = parseInt(filters.minSalary)
    }
    if (filters.hasEquity){
      filters.hasEquity = JSON.parse(filters.hasEquity);
    }
    const validation = validate(filters,jobFilterSchema)
    if (!validation.valid){
      throw new ExpressError({
      error:validation.errors.map(e=>e.stack)
    },400);}
    let filterArr = []
    let filterStrings = []
    let {title, minSalary, hasEquity} = filters;
    let query = `SELECT * FROM jobs WHERE `
    if (title) {
      filterArr.push(title)
      filterStrings.push(`title ILIKE '%' || $${filterArr.length} || '%'`)
    }
    if (minSalary){
      filterArr.push(minSalary)
      filterStrings.push(`salary >= $${filterArr.length}`)
    }
    if (hasEquity===true){
      hasEquity = 0
      filterArr.push(hasEquity)
      filterStrings.push(`equity > $${filterArr.length}`)
    }
    if (filterArr.length>1){
      query += filterStrings.join(" AND ")
    } else {
      query += filterStrings.join('')
    }
    const jobs = await db.query(query,filterArr);
    if (jobs.rowCount===0) throw new NotFoundError(`No job results found`);
    return jobs.rows;
  }

  static async findAll() {
    const jobsRes = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           ORDER BY title`);
    return jobsRes.rows;
  }

  static async get(id) {
    const jobRes = await db.query(
          `SELECT *
           FROM jobs
           WHERE id = $1`,
        [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job found`);

    const companies = await db.query(`SELECT * FROM companies WHERE handle = $1`,[job.company_handle]);
    job.company = companies.rows[0];

    return job;
  }

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                salary, 
                                equity, 
                                title, 
                                company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`no job found`);

    return job;
  }

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job found`);
  }
}


module.exports = Job;
