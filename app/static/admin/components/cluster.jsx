class ClusterStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state  = {
      clusters: {workers: []},
      loading: false, version: {}};
    this._restOptions = {
      timeout: 500,
      headers: {Authorization: `Bearer ${this.props.token}`}};
    setInterval(this.updateData.bind(this), 1000);
  }
  reload() {
    axios
    .post('/api/v0/restart', this._restOptions)
      .then((response) => {
        //this.setState({restart: response.data});
      });
  }
  version() {
    axios
    .get('/api/v0/version', this._restOptions)
      .then((response) => {
        this.setState({version: response.data});
      });
  }
  updateData() {
    // show the loading overlay
    this.setState({loading: true})
    // fetch your data
    this.getClusters()
      .then((data) => {
        this.setState({clusters: data});
      })
      .then(() => {
        // Update react-table
        this.setState({loading: false});
      })
  }
  getClusters() {
    return axios
    .get('/api/v0/clusters', this._restOptions)
      .then((response) => {
        return response.data;
      })
      //.catch(() => {workers: []});
  }
  render() {
    const ReactTable = window.ReactTable.default;
    return (
      <div>
        <button onClick={this.reload.bind(this)}>reload workers</button>
        <ReactTable
          data={this.state.clusters.workers}
          loading={this.state.loading}
          onFetchData={(state, instance) => {
            this.updateData();
          }}
          columns={[
            {
              Header: "Workers",
              columns: [
                {
                  Header: "ID",
                  accessor: "id"
                },
                {
                  Header: "PID",
                  id: "pid",
                  accessor: o => `${o.pid}`
                },
                {
                  Header: "status",
                  accessor: 'status',
                  Cell: row => (
                    <span>
                      <span style={{
                        color: row.row._original.isDead ? '#ff2e00'
                          : row.row._original.closing ? '#ffbf00'
                          : '#57d500',
                        transition: 'all .3s ease'
                      }}>
                        &#x25cf;
                      </span> {
                        row.row._original.isDead ? 'DEAD'
                        : row.row._original.starting ? 'starting'
                        : row.row._original.isConnected ? 'OK'
                        : row.row._original.closing ? 'closing'
                        : '?!?!'
                      }
                    </span>)
                }
              ]
            }
          ]}
          minRows={4}
          showPageJump={false}
          showPagination={false}
          showPaginationBottom={false}
          showPageSizeOptions={false}
          className="-striped -highlight"
        />
      </div>
    );
  }
}
