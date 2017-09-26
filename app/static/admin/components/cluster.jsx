class ClusterStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state  = {status: ''};
    this._headers = {headers: {Authorization: `Bearer ${this.props.token}`}};
    setTimeout(this.updateStatus.bind(this),1000);
  }
  reload() {
    /*axios
    .post('/api/v0/clusters/reset', this._headers)
      .then((response) => {
        this.setState({status: response.data});
      });*/
  }
  updateStatus() {
    axios
    .get('/api/v0/clusters', this._headers)
      .then((response) => {
        this.setState({status: response.data});
      });
  }
  render() {
    return (
      <div>
      <button onClick="reload" value="reload workers"/>
      <pre id="status">
      {JSON.stringify(this.state.status, null, 2)}
      </pre>
      </div>
    );
  }
}
