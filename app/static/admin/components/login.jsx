const {Transport, Authentication} = opentmiClient;

class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this._transport = new opentmiClient.Transport();
    this._transport.token = localStorage.getItem("token");
    this._auth = new Authentication(this._transport);
    this.state = {email: '', password: ''};
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
  }
  logout(event) {
    this._auth.logout().then(() => {
      localStorage.removeItem("token");
      console.log('logout succesfully');
      this.setState({token: undefined});
    })
  }
  handleEmailChange(event) {
    this.setState({email: event.target.value});
  }
  handlePasswordChange(event) {
    this.setState({password: event.target.value});
  }
  login(event) {
    event.preventDefault();
    this._auth.login(this.state.email, this.state.password)
      .then((token) => {
        localStorage.setItem("token", token);
        console.log('Saved tokeb to localStorage');
        this.setState({token});
        return this._transport.connect();
      })
      .catch((error) => {
        alert(error.response.data.message)
      });
  }
  render() {
    if (this._transport.token) {
      return (
        <div>
          <button onClick={this.logout}>logout</button>
          <br/>
          <UpdateForm
            transport={this._transport}
            />
          <ClusterStatus
            transport={this._transport}
            />
        </div>
      );
    } else
    return (
      <div>
        <form onSubmit={this.login}>
        <label>
          Username:
          <input type="text" value={this.state.email} onChange={this.handleEmailChange} />
          Password:
          <input type="password" value={this.state.password} onChange={this.handlePasswordChange} />
        </label>
        <input type="submit" value="Login" />
      </form>
      <ClusterStatus
        transport={this._transport}
        />
    </div>
    );
  }
}
