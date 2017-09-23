class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {email: '', password: '', token: ''};
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }
  handleEmailChange(event) {
    this.setState({email: event.target.value});
  }
  handlePasswordChange(event) {
    this.setState({password: event.target.value});
  }
  handleSubmit(event) {
    console.log(this.state);
    event.preventDefault();
    axios
      .post('/auth/login', this.state)
      .then((response) => {
        console.log(response);
        this.setState({token: response.data.token});
      })
      .catch((error) => {
        this.setState({token: ''});
        alert(error.response.data.message)
      });
  }
  render() {
    if (this.state.token) {
      return (
        <UpdateForm
          token={this.state.token}
        />
      );
    } else
    return (
      <form onSubmit={this.handleSubmit}>
      <label>
        Username:
        <input type="text" value={this.state.email} onChange={this.handleEmailChange} />
        Password:
        <input type="password" value={this.state.password} onChange={this.handlePasswordChange} />
      </label>
      <input type="submit" value="Submit" />
    </form>
    );
  }
}
