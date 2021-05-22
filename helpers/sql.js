const { BadRequestError } = require("../expressError");

// to set up a psql update operation that returns setCols (the columns to be updated set to incrementing values in form of $1,$2...)
// and returns values to set to each column, also provides validation that data is being submitted
// pass in data {first_name:"sally",last_name:"Jack",is_admin:"not_admin"} and {firstName: "first_name",lastName: "last_name",isAdmin: "is_admin",}
// returns {setCols:['"first_name"=$1', '"last_name"=$2','"is_admin"=$3'],values:["shelly","jack","is_admin"]}

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
