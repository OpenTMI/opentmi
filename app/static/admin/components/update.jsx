class Link extends React.Component {
  render() {
    return (
      <a href={this.props.url}>
        {this.props.text}
      </a>
    );
  }
}
class UpdateForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      version: '',
      url: '',
      status: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this._headers = {headers: {Authorization: `Bearer ${this.props.token}`}};
    console.log(this._headers);
    this.updateCurrentVersion();
  }
  updateCurrentVersion() {
    axios
      .get('/api/v0/version', this._headers)
      .then((response) => {
        console.log(response);
        let version = `${response.data.version}-${response.data.commitID}`;
        let url = `https://github.com/OpenTMI/opentmi/commit/${response.data.commitID}`;
        if(response.data.tag) {
          version = response.data.tag;
          url = `https://github.com/OpenTMI/opentmi/releases/tag/${response.data.tag}`;
        }
        this.setState({version, url});
      })
      .catch((error) => {
        this.setState({version: undefined});
      });
  }
  handleChange(event) {
    this.setState({value: event.target.value});
  }
  handleSubmit(event) {
    this.setState({status: `Updating in progress..${this.state.value}`});
    event.preventDefault();
    axios
      .post('/api/v0/version',
        {revision: this.state.value},
        this._headers)
      .then((response) => {
        console.log(response);
        this.setState({status: `Update success`});
      })
      .catch((error) => {
        this.setState({status: `Update fails: ${error.response.data.message}`});
        alert(error.response.data.message)
      })
      .then(() => {
        this.updateCurrentVersion();
      });
  }
  render() {
    return (
      <div>
      Current version: <Link text={this.state.version} url={this.state.url}/>
      <br/>
      {this.state.status}
      <br/>
      <form onSubmit={this.handleSubmit}>
      <label>
        Version to be updated:
        <input type="text" value={this.state.value} onChange={this.handleChange} />
      </label>
      <input type="submit" value="Start Updating" />
    </form>
    </div>
    );
  }
}
