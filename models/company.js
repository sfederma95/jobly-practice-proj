"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const jsonschema = require("jsonschema");
const {validate} = require('jsonschema');
const companyFilterSchema = require("../schemas/companyFilter.json");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }
  // validate incoming query strings if present name,minEmployees,maxEmployees through search schema and check that min does not exceed max
  // create query string passed to database with each filter provided
  // returns "company": [{"handle": "bauer-gallagher","name": "Bauer-Gallagher","num_employees": 862,"description": "Difficult ready trip question produce produce someone.","logo_url": null}]

  static async companyFilter(filters) {
    if (filters.minEmployees){
      filters.minEmployees = parseInt(filters.minEmployees)
    }
    if (filters.maxEmployees){
      filters.maxEmployees = parseInt(filters.maxEmployees)
    }
    const validation = validate(filters,companyFilterSchema)
    if (!validation.valid){
      throw new ExpressError({
      error:validation.errors.map(e=>e.stack)
    },400);}
    let filterArr = []
    let filterStrings = []
    const {name, minEmployees, maxEmployees} = filters;
    if (minEmployees > maxEmployees) {
      throw new ExpressError('Minimum employees should not exceed maximum employees',400)
    }
    let query = `SELECT * FROM companies WHERE `
    if (name) {
      filterArr.push(name)
      filterStrings.push(`name ILIKE '%' || $${filterArr.length} || '%'`)
    }
    if (minEmployees){
      filterArr.push(minEmployees)
      filterStrings.push(`num_employees >= $${filterArr.length}`)
    }
    if (maxEmployees){
      filterArr.push(maxEmployees)
      filterStrings.push(`num_employees <= $${filterArr.length}`)
    }
    if (filterArr.length>1){
      query += filterStrings.join(" AND ")
    } else {
      query += filterStrings.join('')
    }
    const companies = await db.query(query,filterArr)
    if (companies.rowCount===0) throw new NotFoundError(`No company results found`);
    return companies.rows
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
