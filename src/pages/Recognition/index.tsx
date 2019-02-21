import React from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { Icon } from 'react-icons-kit';
import { History } from 'history';
import { circleONotch } from 'react-icons-kit/fa/circleONotch';
import Helmet from 'react-helmet';
import { withCookies } from 'react-cookie';
import { micA } from 'react-icons-kit/ionicons/micA';
import { stop } from 'react-icons-kit/fa/stop';
import { injectIntl, InjectedIntl } from 'react-intl';

import RecordingButton from '../../components/RecordingButton';
import Navbar from '../../components/Navbar';
import { Container } from './styles';
import { connect } from 'react-redux';
import ReduxState from '../../types/GlobalState';
import {
  setRecognitionResults,
  setUnableToRecord,
} from '../../store/actions/recognition';
import config from '../../../config';
import { startRecording, stopRecording } from '../../helpers/recorder';
import { toggleIsRecording } from '../../store/actions/status';
import RecordingError from '../../components/RecordingError';
import KEYS from '../../locale/keys';
import T from "../../components/T";
import logScreen from "../../helpers/logScreen";

const cdnURL = config('cdnURL');

interface IOwnProps {
  history: History;
  intl: InjectedIntl;
}

interface IState {
  isRecording: boolean;
  partialQuery: string;
  query: string;
  isLoading: boolean;
  showErrorMessage: boolean;
  errorMessage: JSX.Element;
}

interface IStateProps {
  canRecord: boolean;
}

interface IDispatchProps {
  setRecognitionResults(result: any): void;
  setUnableToRecord(): void;
}

type IProps = IOwnProps & IDispatchProps & IStateProps;

class Recognition extends React.Component<IProps, IState> {
  recognition: SpeechRecognition;

  state = {
    isRecording: false,
    partialQuery: '',
    query: '',
    isLoading: false,
    showErrorMessage: false,
    errorMessage: '',
  };
  handleRecordingButton = () => {
    if (this.state.isLoading) {
      return;
    } else if (this.state.isRecording) {
      this.stopRecognition();
      this.handleStopRecording();
    } else {
      this.startRecognition();
    }
  };
  stopRecognition = () => {
    this.setState({
      isRecording: false,
    });
    this.recognition.onend = () => null;
    this.recognition.stop();
  };
  handleRecordingError = (e) => {
    console.log(e);
  }
  handleStartRecording = () => {
    // resets the query string with new recordings
    this.setState({
      query: ''
    })
    const recConfig = {
      onError: this.handleRecordingError,
    };
     startRecording(recConfig);
  };
  handleStopRecording = () => {
    stopRecording();
  };
  handleRecognitionResult = (e) => {
    let interimTranscript = '';
    for (let i = e.resultIndex; i < e.results.length; ++i) {
      if (e.results[i].isFinal) {
        this.handleSearch(this.state.query + ' ' + e.results[i][0].transcript);
      } else {
        interimTranscript += e.results[i][0].transcript;
      }
    }
    this.setState(() => {
      return {
        partialQuery: interimTranscript,
      };
    });
  };
  startRecognition = () => {
    this.setState({
      isRecording: true,
    });
    this.recognition = new webkitSpeechRecognition();
    this.recognition.lang = 'ar-AE';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.addEventListener('result', this.handleRecognitionResult);
    this.recognition.onerror = this.handleRecognitionError;
    this.recognition.onend = this.recognition.start;

    this.handleStartRecording();
    this.recognition.start();
  };
  showErrorMessage = (message: JSX.Element) => {
    this.setState({
      showErrorMessage: true,
      errorMessage: message,
    });
  };
  handleRecognitionError = event => {
    this.stopRecognition();
    this.handleStopRecording();
    const errorLink = '//support.google.com/websearch/answer/2940021';
    const chromeLink = '//support.google.com/chrome/answer/2693767';
    if (event.error === 'no-speech') {
      this.showErrorMessage(
        <p>
          <T id={KEYS.AYAH_RECOGNITION_NO_SPEECH_ERROR} values={{errorLink}} />
        </p>,
      );
    } else if (event.error === 'audio-capture') {
      this.showErrorMessage(
        <p>
          <T id={KEYS.AYAH_RECOGNITION_AUDIO_CAPTURE_ERROR} values={{errorLink}} />
        </p>,
      );
    } else if (event.error === 'not-allowed') {
      this.showErrorMessage(
        <p>
          <T id={KEYS.AYAH_RECOGNITION_MIC_PERMISSION_ERROR} values={{chromeLink}} />
        </p>,
      );
    }
  };
  resetSearch = () => {
    this.setState({
      query: '',
    });
  };
  handleSearch = (query: string) => {
    this.recognition.stop();
    this.setState({
      isLoading: true,
    });
    query = query.trim();
    this.setState(state => {
      return {
        query,
        partialQuery: '',
      };
    });
    fetch('https://api.iqraapp.com/api/v3.0/search', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arabicText: query,
        translation: 'en-hilali',
        apikey: config('iqraApiKey'),
      }),
    })
      .then(res => res.json())
      .then(json => {
        this.setState({
          isLoading: false,
        });
        this.props.setRecognitionResults(json.result);
        if (json.result.matches.length) {
          this.stopRecognition();
          this.props.history.push('/recognition/results');
          console.log(json.result);
        } else {
          this.recognition.start();
        }
      });
  };
  componentDidMount() {
    logScreen();
    this.resetSearch();
    if (!Boolean(window.webkitSpeechRecognition)) {
      this.upgradeRequired();
    }
  }
  upgradeRequired = () => {
    this.props.setUnableToRecord();
  };
  handleOGImage = () => {
    const locale = this.props.cookies.get('currentLocale') || 'en';
    return `${cdnURL}/og/recognition_${locale}.png`;
  };
  componentWillUnmount() {
    if (this.recognition) {
      this.recognition.stop();
      this.handleStopRecording();
    }
  }
  render() {
    const classnames = classNames({
      recording: this.state.isRecording,
    });
    const ogTitle = this.props.intl.formatMessage({
      id: KEYS.AYAH_RECOGNITION,
    });
    return (
      <Container>
        <Helmet>
          <title>{ogTitle}</title>
          <meta property={'og:image'} content={this.handleOGImage()} />
          <meta name={'twitter:image'} content={this.handleOGImage()} />
        </Helmet>
        <Navbar />
        {this.state.showErrorMessage && (
          <RecordingError
            message={this.state.errorMessage}
            onClose={() => {
              this.setState({ showErrorMessage: false });
            }}
          />
        )}
        {!this.props.canRecord ? (
          <h3 className={'not-supported'}>
            <T id={KEYS.AYAH_RECOGNITION_UPDATE_REQUIRED} />
          </h3>
        ) : (
          <div className={'content'}>
            <div>
              <h2>
                <T id={KEYS.AYAH_RECOGNITION} />
              </h2>
              <p className={'status'}>
                <T id={KEYS.AYAH_RECOGNITION_RECOGNITION_MESSAGE} />
              </p>
            </div>
            <div className="words">
              <span className={'query'}>{this.state.query}</span>
              &nbsp;
              <span className="partial-query">{this.state.partialQuery}</span>
            </div>
            <RecordingButton
              className={`mic ${classnames}`}
              onClick={this.handleRecordingButton}
            >
              {this.state.isLoading ? (
                <div className={'icon spin'}>
                  <Icon icon={circleONotch} size={20} />
                </div>
              ) : !this.state.isRecording ? (
                <Icon icon={micA} size={30} />
              ) : (
                <Icon icon={stop} size={30} />
              )}
            </RecordingButton>
            <p className={'splittable'}>
              <T id={KEYS.AYAH_RECOGNITION_IMPROVE_ACCURACY} />
              &nbsp;
              <br />
              <Link to={'/'}>
                <T id={KEYS.AYAH_RECOGNITION_CONTRIBUTE} />
              </Link>
            </p>
            <p className={'iqra'}>
              <T id={KEYS.AYAH_RECOGNITION_POWERED_BY} values={{ url: 'https://iqraapp.com/' }} />
            </p>
          </div>
        )}
      </Container>
    );
  }
}

const mapStateToProps = (state: ReduxState): IStateProps => {
  return {
    canRecord: state.recognition.canRecord,
  };
};

const mapDispatchToProps = (dispatch): IDispatchProps => {
  return {
    setRecognitionResults: (result: any) => {
      return dispatch(setRecognitionResults(result));
    },
    setUnableToRecord: () => {
      return dispatch(setUnableToRecord());
    },
  }
}

export default injectIntl(
  withCookies(
    connect(
      mapStateToProps,
      mapDispatchToProps
    )(Recognition)
  )
);
