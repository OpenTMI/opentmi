class ClusterStatus extends React.Component {
  constructor(props) {
    super(props);
    this._cluster = new opentmiClient.Cluster(props.transport);
    this.state = {
      clusters: {workers: []},
      memory: [], hostCpu: [],
      loading: false, version: {}};
  }
  reload() {
    this._cluster.restartWorkers()
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
    this.setState({loading: true});
    // fetch your data
    return this.getClusters()
      .then((data) => {
        this.state.memory.push({x: new Date(), y: data.currentMemoryUsage/1024/1024});
        this.state.hostCpu.push({x: new Date(), y: parseFloat(data.hostCpu)})
        this.setState({clusters: data, memory: this.state.memory, hostCpu: this.state.hostCpu});
      })
      .then(() => {
        // Update react-table
        this.setState({loading: false});
      })
      .then(() => setTimeout(()=> this.updateData(), 2000));
  }
  getClusters() {
    return this._cluster.refresh()
      .then(() => {
        return this._cluster.data;
      })
      //.catch(() => {workers: []});
  }
  render() {
    const ReactTable = window.ReactTable.default;
    const Chart = window['react-chartjs'];
    const {Line} = Chart;
    var chartData = {
      labels: [],
      datasets: [{
          label: 'Memory Usage',
          data: this.state.memory,
          borderWidth: 1,
          fill: true,
          yAxisID: 'mem'
      },
      {
          label: 'Host CPU',
          data: this.state.hostCpu,
          borderWidth: 1,
          fill: true,
          yAxisID: 'cpu'
      }]
    }

    var chartOptions = {
      scales: {
          xAxes: [{
              ticks: {
                source: 'auto'
              },
              type: 'time',
              time: {
                  displayFormats: {
                      quarter: 'MMM YYYY hh:mm:ss'
                  }
              }
          }],
          yAxes: [{
            id: 'mem',
            type: 'linear',
            position: 'left',
          }, {
            id: 'cpu',
            type: 'linear',
            position: 'right'
          }]
      }
    };
    const tableColumns = [
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
                    : (row.row._original.closing || row.row._original.starting) ? '#ffbf00'
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
    ];

    return (
      <div>
        <button onClick={this.reload.bind(this)}>reload workers</button>
        <ReactTable
          data={this.state.clusters.workers}
          loading={this.state.loading}
          onFetchData={(state, instance) => {
            this.updateData();
          }}
          columns={tableColumns}
          minRows={4}
          showPageJump={false}
          showPagination={false}
          showPaginationBottom={false}
          showPageSizeOptions={false}
          className="-striped -highlight"
        />
        <Line data={chartData} options={chartOptions} width="400" height="100"/>
      </div>
    );
  }
}
