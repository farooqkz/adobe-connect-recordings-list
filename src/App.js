import React from "react";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import * as localforage from "localforage";
import MUIDataTable from "mui-datatables";

const GATEWAY_URL = "http://localhost:5000/moomoo.mrcow";

class App extends React.Component {
  handleClick = () => {
    this.setState({ open: true });
  };

  handleKeyDown = (evt) => {
    if (evt.key !== "Enter") {
      return;
    }
    if (this.state.open && !this.state.shouldLogin) {
      this.handleLogin();
    } else {
      this.setState({ open: true });
    }
  };
  
  handleLogout = () => {
    localforage.setItem("info", null).then(() => {
      alert("Logged out successfully");
      // eslint-disable-next-line no-self-assign
      window.location = window.location;
    });
  };

  handleLogin = () => {
    let url = this.state.url;
    const username = this.state.username;
    const password = this.state.password;
    if (!url.startsWith("https://") && !url.startsWith("http://"))
      url = "https://" + url;
    if (username === "" || password === "" || url === "") {
      alert("Please fill 'em all!");
      return;
    }
    fetch(GATEWAY_URL, {
      method: "POST",
      body: JSON.stringify({
        username: username,
        url: url,
        password: password,
      }),
      headers: { "Content-type": "application/json" },
    }).then((response) => {
      if (response.ok) {
        response.json().then((j) => {
          this.data = [];
          for (let class_ of Object.entries(j)) {
            for (let recording of class_[1]) {
              let date = recording.date.split("T")[0].split("-");
              this.data.push({
                class_: class_[0],
                year: date[0],
                month: date[1],
                day: date[2],
                url: url + recording.url,
              });
            }
          }
          this.setState({ gotData: true });
        });
        if (this.state.shouldLogin) {
          localforage
            .setItem("info", {
              url: url,
              username: username,
              password: password,
            })
            .then(() => {
              alert("Logged in successfully :)");
            });
        }
      } else {
        alert("Invalid credentials!");
      }
    });
  };

  updateUrl = (evt) => {
    this.setState({ url: evt.target.value });
  };

  updateUsername = (evt) => {
    this.setState({ username: evt.target.value });
  };

  updatePassword = (evt) => {
    this.setState({ password: evt.target.value });
  };

  constructor(props) {
    super(props);
    this.data = null;
    this.state = {
      open: false,
      url: "",
      username: "",
      password: "",
      gotData: false,
      shouldLogin: null,
    };
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown);
    localforage.getItem("info").then((info) => {
      if (!info) {
        this.setState({ shouldLogin: true });
        return;
      }
      this.setState({
        url: info.url,
        username: info.username,
        password: info.password,
        shouldLogin: false,
      });
      this.handleLogin();
    });
  }

  componentWillUnmount() {
    document.addEventListener("keydown", this.handleKeyDown);
  }

  render() {
    if (this.state.gotData) {
      return (<>
        <Button variant="contained" onClick={this.handleLogout}>Log out</Button>
          <MUIDataTable
            title={"Recordings"}
            data={this.data}
            columns={[
              {
                name: "class_",
                label: "Class",
                options: { filterType: "multiselect" },
              },
              {
                name: "year",
                label: "Year",
                options: { filterType: "multiselect" },
              },
              {
                name: "month",
                label: "Month",
                options: { filterType: "multiselect" },
              },
              {
                name: "day",
                label: "Day",
                options: { filterType: "multiselect" },
              },
              {
                name: "url",
                label: "URL",
                options: { filter: false, sort: false },
              },
            ]}
            options={{ selectableRows: "none" }}
          /></>
      );
    }
    if (this.state.shouldLogin) {
      return (
        <div className="App">
          <Button variant="outlined" color="primary" onClick={this.handleClick}>
            Login
          </Button>
          <Dialog
            open={this.state.open}
            onClose={() => this.setState({ open: false })}
          >
            <DialogTitle>Login</DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                fullWidth
                label="URL (starting with https://)"
                autoComplete="on"
                onChange={this.updateUrl}
              />
              <TextField
                autoFocus
                fullWidth
                label="Username"
                autoComplete="on"
                onChange={this.updateUsername}
              />
              <TextField
                autoFocus
                fullWidth
                label="Password"
                type="password"
                onChange={this.updatePassword}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleLogin} color="primary">
                Login
              </Button>
            </DialogActions>
          </Dialog>
        </div>
      );
    } else {
      return <div className="App">Please wait...</div>;
    }
  }
}

export default App;
