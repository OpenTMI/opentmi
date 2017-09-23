class Link extends React.Component {
  render() {
    return (
      <div>
      Version:
      <a href={this.props.url}>
        {this.props.text}
      </a>
      </div>
    );
  }
}
class UpdateForm extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);
    this.state = {value: '', version: '', url: ''};
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this._headers = {Authorization: `Bearer ${this.props.token}`};
    console.log(this._headers);
    this.updateCurrentVersion();
  }
  updateCurrentVersion() {
    axios
      .get('/api/v0/version', {headers: this._headers})
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
    alert(`Updating in progress..${this.state.value}`);
    event.preventDefault();
    axios
      .post('/api/v0/version',
        {revision: this.state.value},
        this._headers)
      .then((response) => {
        console.log(response);
        alert("Updating in progress...")
      })
      .catch((error) => {
        alert(error.response.data.message)
      });
  }
  render() {
    return (
      <div>
      <Link text={this.state.version} url={this.state.url}/>
      <form onSubmit={this.handleSubmit}>
      <label>
        Version:
        <input type="text" value={this.state.value} onChange={this.handleChange} />
      </label>
      <input type="submit" value="Submit" />
    </form>
    </div>
    );
  }
}
