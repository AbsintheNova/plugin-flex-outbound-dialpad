import React from "react";
import { Actions, Manager } from "@twilio/flex-ui";
import {
  withStyles,
  MuiThemeProvider,
  createMuiTheme
} from "@material-ui/core/styles";
import Phone from "@material-ui/icons/Phone";
import CallEnd from "@material-ui/icons/CallEnd";
import ClickNHold from "react-click-n-hold";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import { green, red } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import Backspace from "@material-ui/icons/Backspace";

import classNames from "classnames";
import { connect } from "react-redux";


import { takeOutboundCall } from "../../eventListeners/workerClient/reservationCreated";

import { FUNCTIONS_HOSTNAME, DEFAULT_FROM_NUMBER, SYNC_CLIENT } from "../../OutboundDialingWithConferencePlugin"

const styles = theme => ({
  main: {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  dialpad: {
    width: "100%",
    maxHeight: "700px",
    maxWidth: "400px",
    backgroundColor: theme.SideNav.Container.background
  },
  headerInputContainer: {
    display: "flex",
    justifyContent: "stretch",
    alignItems: "center",
    marginBottom: "25px",
    marginLeft: "30px"
  },
  headerInput: {
    minHeight: "40px",
    maxHeight: "40px",
    borderBottom: "2px solid white",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    borderRadius: theme.shape.borderRadius,
    fontSize: "1.5em",
    padding: theme.spacing.unit,
    flexGrow: 1,
    marginRight: "5px",
    color: "white"
  },
  backspaceButton: {
    cursor: "pointer",
    color: theme.palette.grey[100],
    "&:hover": {
      opacity: ".4"
    }
  },
  numpadContainer: {
    margin: theme.spacing.unit
  },
  numpadRowContainer: {
    display: "flex",
    marginBottom: "15px",
    justifyContent: "center"
  },
  numberButtonContainer: {
    width: "33%"
  },
  numberButton: {
    display: "block",
    margin: theme.spacing.unit,
    width: "60px",
    height: "60px",
    borderRadius: "100%",
    paddingBottom: "20%",
    fontSize: "1.2em",
    fontWeight: "700",
    textAlign: "center"
  },
  functionButton: {
    paddingBottom: "0%"
  },
  hide: {
    visibility: "hidden"
  }
});

const greenButton = createMuiTheme({
  palette: {
    primary: green
  },
  typography: {
    useNextVariants: true
  }
});

const redButton = createMuiTheme({
  palette: {
    primary: red
  },
  typography: {
    useNextVariants: true
  }
});

export class DialPad extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      number: ""
    };

    this.token = Manager.getInstance().user.token;
    this.syncClient = SYNC_CLIENT;
    this.syncDocName = `${this.props.workerContactUri}.outbound-call`;

    //audio credit https://freesound.org/people/AnthonyRamirez/sounds/455413/
    //creative commons license
    this.ringSound = new Audio(
      "https://freesound.org/data/previews/455/455413_7193358-lq.mp3"
    );
    this.ringSound.loop = true;
    this.ringSound.volume = 0.5;
  }

  buttons = [
    [
      {
        value: "1",
        letters: ""
      },
      {
        value: "2",
        letters: "abc"
      },
      {
        value: "3",
        letters: "def"
      }
    ],
    [
      {
        value: "4",
        letters: "ghi"
      },
      {
        value: "5",
        letters: "jkl"
      },
      {
        value: "6",
        letters: "mno"
      }
    ],
    [
      {
        value: "7",
        letters: "pqrs"
      },
      {
        value: "8",
        letters: "tuv"
      },
      {
        value: "9",
        letters: "wxyz"
      }
    ],
    [
      {
        value: "*",
        letters: " "
      },
      {
        value: "0",
        letters: "+"
      },
      {
        value: "#",
        letters: " "
      }
    ]
  ];

  numpad = this.buttons.map((rowItem, rowIndex) => {
    const { classes } = this.props;

    return (
      <div className={classes.numpadRowContainer} key={rowIndex}>
        {rowItem.map((item, itemIndex) => {
          return (
            <div className={classes.numberButtonContainer}>
              {item.value !== "0"
                ? this.standardNumberButton(item)
                : this.clickNHoldButton(item)}
            </div>
          );
        })}
      </div>
    );
  });

  standardNumberButton(item) {
    const { classes } = this.props;
    return (
      <Button
        variant="contained"
        aria-label={item.value}
        key={item.value}
        className={classNames(classes.numberButton)}
        onClick={e => this.buttonPress(item.value)}
      >
        {item.value}
        {item.letters && (
          <div
            style={{
              fontSize: "50%",
              fontWeight: "300"
            }}
          >
            {item.letters}
          </div>
        )}
      </Button>
    );
  }

  clickNHoldButton(item) {
    const { classes } = this.props;
    return (
      <ClickNHold
        time={0.8}
        onClickNHold={e => this.buttonPlusPress(e, item)}
        onEnd={(e, threshold) => this.buttonZeroPress(e, threshold, item)}
      >
        <Button
          variant="contained"
          aria-label={item}
          key={item}
          className={classNames(classes.numberButton)}
        >
          {item.value}
          {item.letters && (
            <div
              style={{
                fontSize: "50%",
                fontWeight: "300"
              }}
            >
              {item.letters}
            </div>
          )}
        </Button>
      </ClickNHold>
    );
  }

  functionButtons() {
    const { classes } = this.props;

    return (
      <div className={classes.numpadRowContainer} style={{ marginBottom: 0 }}>
        {this.props.call.callStatus !== "queued" &&
          this.props.call.callStatus !== "ringing" &&
          this.props.activeCall === "" ? (
            <div className={classes.numberButtonContainer}>
              <MuiThemeProvider theme={greenButton}>
                <Button
                  variant="contained"
                  style={{ color: "white" }}
                  color="primary"
                  className={classNames(
                    classes.numberButton,
                    classes.functionButton,
                    this.props.call.callStatus === "dialing" ? classes.hide : ""
                  )}
                  onClick={e => {
                    this.dial(this.state.number);
                  }}
                >
                  <Phone />
                </Button>
              </MuiThemeProvider>
            </div>
          ) : (
            <div />
          )}
        {this.props.call.callStatus === "queued" ||
          this.props.call.callStatus === "ringing" ? (
            <div className={classes.numberButtonContainer}>
              <MuiThemeProvider theme={redButton}>
                <Button
                  variant="contained"
                  style={{ color: "white" }}
                  color="primary"
                  className={classNames(
                    classes.numberButton,
                    classes.functionButton,
                    this.props.call.callStatus === "queued" ? classes.hide : ""
                  )}
                  onClick={e => this.hangup(this.props.call.callSid)}
                >
                  <CallEnd />
                </Button>
              </MuiThemeProvider>
            </div>
          ) : (
            <div />
          )}
      </div>
    );
  }

  updateStateFromSyncDoc(docObject) {
    console.log(docObject);
    this.props.setCallFunction(docObject);

    if (docObject.callStatus === "ringing") {
      this.ringSound.play();
    } else if (docObject.callStatus === "in-progress") {
      this.ringSound.pause();
      this.ringSound.currentTime = 0;
      takeOutboundCall();
      this.props.closeViewFunction();
    } else if (
      docObject.callStatus === "completed" ||
      docObject.callStatus === "canceled"
    ) {
      this.ringSound.pause();
      this.ringSound.currentTime = 0;
    }
  }


  initSyncDoc() {
    // init sync doc on component mount
    this.syncClient
      .document(this.syncDocName)
      .then(doc => {
        this.updateStateFromSyncDoc(doc.value);
        doc.on("updated", updatedDoc => {
          this.updateStateFromSyncDoc(updatedDoc.value)
        })
      })
  }



  componentDidMount() {
    this.initSyncDoc();

    document.addEventListener("keydown", this.eventkeydownListener, false);
    document.addEventListener("keyup", this.eventListener, false);
    document.addEventListener("paste", this.pasteListener, false);
  }

  componentWillUnmount() {
    console.log("Unmounting Dialpad");
    //this.syncClient = null;

    document.removeEventListener("keydown", this.eventkeydownListener, false);
    document.removeEventListener("keyup", this.eventListener, false);
    document.removeEventListener("paste", this.pasteListener, false);
    //this.ringSound = null;
    //this.props.setCallFunction({ callSid: "", callStatus: "" });
  }

  makeDialFunctionCall = (to) => {
    let from;
    if (this.state.phoneNumber) {
      from = this.state.phoneNumber
    } else {
      from = DEFAULT_FROM_NUMBER;
    }

    return new Promise((resolve, reject) => {

      fetch(`https://${FUNCTIONS_HOSTNAME}/outbound-dialing/makeCall`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: (
          `token=${this.token}`
          + `&To=${to}`
          + `&From=${from}`
          + `&workerContactUri=${this.props.workerContactUri}`
          + `&functionsDomain=${FUNCTIONS_HOSTNAME}`
        )
      })
        .then(response => {
          console.log(`called ${to}`);
          resolve(response);
        })
        .catch(error => {
          console.error(`error making call`, error);
          reject(error);
        });
    });
  }

  makeHangupFunctionCall = (CallSid) => {
    console.log("JARED, IM CALLING THE FUNCTION");
    return new Promise((resolve, reject) => {

      fetch(`https://${FUNCTIONS_HOSTNAME}/outbound-dialing/endCall`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST',
        body: (
          `token=${this.token}`
          + `&CallSid=${CallSid}`
        )
      })
        .then(response => {
          console.log(`called terminated ${CallSid}`);
          resolve(response);
        })
        .catch(error => {
          console.error(`error making call`, error);
          reject(error);
        });
    });
  }

  dial(number) {
    if (
      this.state.number !== "" &&
      this.props.call.callStatus !== "dialing"
    ) {
      console.log("Calling: ", number);

      Actions.invokeAction("SetActivity", {
        activityName: "Busy"
      })
        .then(() => {
          if (!this.props.available) {
            this.makeDialFunctionCall(this.state.number);
            this.props.setCallFunction({ callSid: "", callStatus: "dialing" })
          }
        })
        .catch(error => {
          console.error("Couldnt switch to 'Busy' so trying 'Offline'");
          Actions.invokeAction("SetActivity", {
            activityName: "Offline"
          })
            .then(() => {
              if (!this.props.available) {
                this.makeDialFunctionCall(this.state.number);
                this.props.setCallFunction({ callSid: "", callStatus: "dialing" })
              }
            })
            .catch(error => {
              console.error(
                "Attempted to auto switch to inactive state but activity doesnt exist, try remapping"
              );
            });
        });
    }
  }

  hangup(callSid) {
    console.debug("JARED IM Hanging up call: ", callSid);

    // only hangup if call is actually ringing
    // if hangup occurs while queued, twilio fails to handle future hang up requests
    if (this.props.call.callStatus === "ringing") {

      this.makeHangupFunctionCall(callSid);

      // TODO: Make this more sophisticated form of activity state management
      Actions.invokeAction("SetActivity", {
        activityName: "Idle"
      }).catch(error => {
        console.error(
          "Attempted to go idle but activity not available, trying 'Available'"
        );
        Actions.invokeAction("SetActivity", {
          activityName: "Available"
        }).catch(error => {
          console.error(
            "Attempted to auto switch to Idle state but activity doesnt exist, try remapping which state to auto switch to"
          );
        });
      });
    }
  }

  eventListener = e => this.keyPressListener(e);
  eventkeydownListener = e => this.keydownListener(e);
  pasteListener = e => {
    const paste = (e.clipboardData || window.clipboardData)
      .getData("text")
      .replace(/\D/g, ""); //strip all non numeric characters from paste
    for (var i = 0; i < paste.length; i++) {
      this.buttonPress(paste.charAt(i));
    }
  };

  keydownListener(e) {
    if (e.keyCode === 8) {
      e.preventDefault();
      e.stopPropagation();
      this.backspace();
    }
  }

  keyPressListener(e) {
    var callStatus = this.props.call.callStatus;
    e.preventDefault();
    e.stopPropagation();
    if ((e.keyCode > 47 && e.keyCode < 58) || e.keyCode === 187) {
      //listen to 0-9 & +
      this.buttonPress(e.key);
    } else if (e.keyCode === 13) {
      //listen for enter
      if (callStatus === "ringing" || callStatus === "in-progress") {
        this.hangup(this.props.call.callSid);
      } else if (
        callStatus === "" ||
        callStatus === "completed" ||
        callStatus === "canceled"
      ) {
        this.dial(this.state.number);
      }
    }
  }

  backspaceAll() {
    this.setState({ number: "" });
  }

  backspace() {
    this.setState({
      number: this.state.number.substring(0, this.state.number.length - 1)
    });
  }
  buttonPress(value) {
    const activeCall = this.props.activeCall;

    if (activeCall === "") {
      if (this.state.number.length < 13) {
        this.setState({ number: this.state.number + value });
      }
    } else {
      console.debug("activeCall", activeCall);
      activeCall.sendDigits(value);
    }
  }

  buttonPlusPress(e, item) {
    this.buttonPress(item.letters);
  }

  buttonZeroPress(e, threshold, item) {
    e.preventDefault();
    e.stopPropagation();
    if (!threshold) {
      this.buttonPress(item.value);
    }
  }

  render() {
    const { classes } = this.props;

    return (
      <div className={classes.main}>
        <Card className={classes.dialpad}>
          <CardContent>
            <div className={classes.headerInputContainer}>
              <div className={classes.headerInput}>{this.state.number}</div>
              <ClickNHold
                time={0.5}
                onStart={this.backspace.bind(this)}
                onClickNHold={this.backspaceAll.bind(this)}
              >
                <Backspace className={classes.backspaceButton} />
              </ClickNHold>
            </div>
            <div className={classes.numpadContainer}>
              {this.numpad.map(button => button)}
              {this.functionButtons()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    phoneNumber: state.flex.worker.attributes.phone,
    workerContactUri: state.flex.worker.attributes.contact_uri,
    activeCall:
      typeof state.flex.phone.connection === "undefined"
        ? ""
        : state.flex.phone.connection.source,
    available: state.flex.worker.activity.available
  };
};

export default connect(mapStateToProps)(withStyles(styles)(DialPad));
