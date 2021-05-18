import React, { Component } from 'react';
import { RETENTION_FORMAT } from '../chat/chatRoom.jsx';
import ModalDialogsUI from './modalDialogs.jsx';

const LIMIT = {
    CHARS: 2,
    HOURS: 24,
    DAYS: 31,
    WEEKS: 4,
    MONTHS: 12
};

export class HistoryRetentionDialog extends Component {
    inputRef = React.createRef();

    state = {
        selectedTimeFormat: HistoryRetentionDialog.labels.timeFormats.plural.hours,
        prevTimeRange: undefined,
        timeRange: undefined
    }

    static keydown = 'keydown.historyRetentionDialog';

    static labels = {
        timeFormats: {
            plural: {
                // hours
                [l[7132]]: l[7132],
                // days
                [l[16290]]: l[16290],
                // weeks
                [l[16293]]: l[16293],
                // months
                [l[6788]]: l[6788]
            },
            singular: {
                // hour
                [l[7132]]: l[7133],
                // day
                [l[16290]]: l[930],
                // week
                [l[16293]]: l[16292],
                // month
                [l[6788]]: l[913]
            }
        },
        copy: {
            title: l[23434],
            subtitle: l[23435],
            cancel: l[82],
            done: l[726]
        }
    };

    static timeFrame = {
        // hours
        [l[7132]]: 1,
        // days
        [l[16290]]: 1,
        // weeks
        [l[16293]]: 7,
        // months
        [l[6788]]: 30
    }

    setInitialState = () => {
        const { chatRoom } = this.props;
        const retentionTime = chatRoom && chatRoom.retentionTime;
        if (retentionTime) {
            const selectedTimeFormat = chatRoom.getRetentionFormat(retentionTime);
            const timeRange = () => {
                switch (selectedTimeFormat) {
                    case RETENTION_FORMAT.DISABLED:
                        return 0;
                    case RETENTION_FORMAT.MONTHS:
                        return Math.floor(secondsToDays(retentionTime) / 30);
                    case RETENTION_FORMAT.WEEKS:
                        return secondsToDays(retentionTime) / 7;
                    case RETENTION_FORMAT.DAYS:
                        return secondsToDays(retentionTime);
                    case RETENTION_FORMAT.HOURS:
                        return secondsToHours(retentionTime);
                }
            };

            this.setState({
                selectedTimeFormat,
                timeRange: timeRange()
            }, () =>
                onIdle(() => {
                    this.inputRef.current.value = this.state.timeRange;
                })
            );
        }
    };

    hasInput = () => !!this.state.timeRange && !!this.state.timeRange.toString().length &&
        parseInt(this.state.timeRange, 10) >= 1;

    getDefaultValue = selectedTimeFormat => {
        const { timeFormats } = HistoryRetentionDialog.labels;
        switch (true) {
            case selectedTimeFormat === timeFormats.plural[l[7132]]:
                return LIMIT.HOURS;
            case selectedTimeFormat === timeFormats.plural[l[16290]]:
                return LIMIT.DAYS;
            case selectedTimeFormat === timeFormats.plural[l[16293]]:
                return LIMIT.WEEKS;
            case selectedTimeFormat === timeFormats.plural[l[6788]]:
                return LIMIT.MONTHS;
        }
    };

    getParsedLabel = (label, timeRange) => {
        timeRange = parseInt(timeRange, 10);
        if (timeRange !== 1) {
            return HistoryRetentionDialog.labels.timeFormats.plural[label];
        }
        return HistoryRetentionDialog.labels.timeFormats.singular[label];
    };

    handleOnChange = e => {
        const selectedTimeFormat = e.target.value;
        const input = this.inputRef.current;
        const value = this.filterTimeRange(input.value, selectedTimeFormat);

        this.setState({
            selectedTimeFormat,
            timeRange: value
        }, () => {
            input.value = this.state.timeRange;
        });
    };

    filterTimeRange = (timeRange, selectedTimeFormat) => {
        const IS_FLOAT = !!timeRange.match(/(\d*\.\d+),?/);

        // Values allowed -- integers, <= 4 characters, 8765 hours, 365 days, 52 weeks, 12 months
        switch (true) {
            case IS_FLOAT:
                return parseInt(timeRange);
            case timeRange.length > LIMIT.CHARS:
                return timeRange.substr(0, LIMIT.CHARS);
            case selectedTimeFormat === RETENTION_FORMAT.HOURS && parseInt(timeRange) > LIMIT.HOURS:
                return LIMIT.HOURS;
            case selectedTimeFormat === RETENTION_FORMAT.DAYS && parseInt(timeRange) > LIMIT.DAYS:
                return LIMIT.DAYS;
            case selectedTimeFormat === RETENTION_FORMAT.WEEKS && parseInt(timeRange) > LIMIT.WEEKS:
                return LIMIT.WEEKS;
            case selectedTimeFormat === RETENTION_FORMAT.MONTHS && parseInt(timeRange) > LIMIT.MONTHS:
                return LIMIT.MONTHS;
        }

        return timeRange;
    }

    handleOnTimeChange = e => {
        const value = this.inputRef.current.value = this.filterTimeRange(e.target.value, this.state.selectedTimeFormat);
        this.setState({
            timeRange: value
        });
    };

    handleOnClick = e => {
        e.preventDefault();
        e.stopPropagation();

        const { chatRoom, onClose } = this.props;
        const { selectedTimeFormat } = this.state;
        const time = HistoryRetentionDialog.timeFrame[selectedTimeFormat] * Number(this.state.timeRange);
        const IS_HOURS = selectedTimeFormat === HistoryRetentionDialog.labels.timeFormats.plural[l[7132]];

        // TODO: remove IS_HOURS, temp re: testing
        chatRoom.setRetention(IS_HOURS ? hoursToSeconds(time) : daysToSeconds(time), IS_HOURS);
        onClose();
    };

    unbindEvents = () => {
        $(document.body).off(HistoryRetentionDialog.keydown);
    };

    bindEvents = () => {
        $(document.body).rebind(HistoryRetentionDialog.keydown, e => {
            const key = e.keyCode ? e.keyCode : e.which;
            if (key === 13 && this.hasInput()) {
                this.handleOnClick(e);
            }
        });
    };

    renderCustomRadioButton = () => {
        return Object.values(HistoryRetentionDialog.labels.timeFormats.plural).map(label => {
            return (
                <CustomRadioButton
                    checked={this.state.selectedTimeFormat === label}
                    label={this.getParsedLabel(label, this.state.timeRange)}
                    name="time-selector"
                    value={label}
                    onChange={this.handleOnChange}
                    key={label}
                />
            );
        });
    };

    componentDidMount() {
        this.bindEvents();
        this.setInitialState();
    }

    componentWillUnmount() {
        this.unbindEvents();
    }

    render() {
        const { chatRoom, onClose } = this.props;
        const hasInput = this.hasInput();
        const selectedTimeFormat = this.state.selectedTimeFormat;

        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                chatRoom={chatRoom}
                onClose={onClose}
                dialogName="msg-retention-dialog"
                dialogType="tool"
                onClick={() => this.inputRef.current.focus()}>

                <header>
                    <h2 id="msg-retention-dialog-title">{HistoryRetentionDialog.labels.copy.title}</h2>
                </header>

                <section className="content">
                    <div className="content-block">
                        <p>{HistoryRetentionDialog.labels.copy.subtitle}</p>
                    </div>
                    <div className="content-block form">
                        <div className="form-section">
                            <span className="form-section-placeholder">
                                {this.getParsedLabel(selectedTimeFormat, this.state.timeRange)}
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                className="form-section-time"
                                placeholder={this.getDefaultValue(selectedTimeFormat)}
                                ref={this.inputRef}
                                autoFocus={true}
                                onChange={this.handleOnTimeChange}
                                onKeyDown={e => (e.key === '-' || e.key === '+' || e.key === 'e') && e.preventDefault()}
                            />
                        </div>
                        <div className="form-section">
                            <div className="form-section-radio">
                                {this.renderCustomRadioButton()}
                            </div>
                        </div>
                    </div>
                </section>

                <footer>
                    <div className="footer-container">
                        <button
                            className="mega-button"
                            onClick={this.props.onClose}>
                            <span>{HistoryRetentionDialog.labels.copy.cancel}</span>
                        </button>
                        <button
                            className={`
                                mega-button positive
                                ${hasInput ? '' : 'disabled'}
                            `}
                            onClick={e => hasInput ? this.handleOnClick(e) : false}>
                            <span>{HistoryRetentionDialog.labels.copy.done}</span>
                        </button>
                    </div>
                </footer>
            </ModalDialogsUI.ModalDialog>
        );
    }
}

function CustomRadioButton({ checked = false, label, name, value, onChange }) {
    return (
        <label
            key={value}
            className="radio-txt">
            {label}

            <div className={
                "custom-radio small green-active " +
                (checked ? "radioOn" : "radioOff")
            }>
                <input
                    type="radio"
                    name={name}
                    value={value}
                    checked={checked}
                    onChange={onChange}
                />
            </div>
        </label>
    );
}
