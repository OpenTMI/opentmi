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
    this._admin = new opentmiClient.Admin(props.transport);
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
    this._admin.version()
      .then((data) => {
        console.log(data);
        let version = `${data.version}-${data.commitId}`;
        let url = `https://github.com/OpenTMI/opentmi/commit/${data.commitId}`;
        if(data.tag) {
          version = data.tag;
          url = `https://github.com/OpenTMI/opentmi/releases/tag/${data.tag}`;
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
    this._admin.upgrade(this.state.value)
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
