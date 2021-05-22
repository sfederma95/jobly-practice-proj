"use strict";

const jsonschema = require("jsonschema");
const express = require("express");
const {validate} = require('jsonschema');

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

router.get("/", async function (req, res, next) {
    try {
      if (Object.keys(req.query).length !== 0){
        const jobs = await Job.jobFilter(req.query)
        return res.json({jobs})
      } else {
        const jobs = await Job.findAll();
        return res.json({ jobs });}
    } catch (err) {
      return next(err);
    }
  });

router.get("/:id", async function (req, res, next) {
    try {
      const job = await Job.get(req.params.id);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });

router.post('/', ensureIsAdmin, async function(req,res,next){
    try{
        const validation = jsonschema.validate(req.body,jobNewSchema);
        if (!validation.valid){
            const err = validation.errors.map(e=>e.stack);
            throw new BadRequestError(err)
        }
        const job = await Job.create(req.body);
        return res.status(201).json({job})
    } catch(err){
        return next(err)
    }
})

router.patch("/:id", ensureIsAdmin, async function (req, res, next) {
    try {
      const validation = jsonschema.validate(req.body, jobUpdateSchema);
      if (!validation.valid) {
        const errs = validation.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }
  
      const job = await Job.update(req.params.id, req.body);
      return res.json({ job });
    } catch (err) {
      return next(err);
    }
  });

router.delete('/:id',ensureIsAdmin, async function(req,res,next){
    try {
        await Job.remove(req.params.id);
        return res.json({deleted: req.params.id});
    } catch(err){
        return next(err)
    }
})

module.exports = router;