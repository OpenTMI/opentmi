const notClustered = (req, res) => {
  res.status(404).json({message: 'clusters is not in use'});
};

module.exports = {notClustered};
