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
    dialogName = 'msg-retention-dialog';
    inputRef = React.createRef();

    state = {
        selectedTimeFormat: RETENTION_FORMAT.HOURS,
        timeRange: undefined
    };

    constructor(props) {
        super(props);
        const { chatRoom } = props;
        this.state.timeRange = chatRoom.getRetentionTimeFormatted();
        if (this.state.timeRange === 0) {
            this.state.timeRange = '';
        }
        this.state.selectedTimeFormat = chatRoom.getRetentionFormat();
        this.state.selectedTimeFormat =
            this.state.selectedTimeFormat === RETENTION_FORMAT.DISABLED
                ? RETENTION_FORMAT.HOURS
                : this.state.selectedTimeFormat;
    }

    hasInput() {
        return this.state.timeRange && parseInt(this.state.timeRange, 10) >= 1;
    }

    getMaxTimeRange(selectedTimeFormat) {
        switch (selectedTimeFormat) {
            case RETENTION_FORMAT.HOURS:
                return LIMIT.HOURS;
            case RETENTION_FORMAT.DAYS:
                return LIMIT.DAYS;
            case RETENTION_FORMAT.WEEKS:
                return LIMIT.WEEKS;
            case RETENTION_FORMAT.MONTHS:
                return LIMIT.MONTHS;
        }
    }

    getParsedLabel(label, timeRange) {
        timeRange = timeRange ? parseInt(timeRange, 10) : this.getMaxTimeRange(label);
        switch (label) {
            case RETENTION_FORMAT.HOURS:
                /* `hour(s)` || `# hour(s)` */
                return mega.icu.format(l.plural_hour, timeRange);
            case RETENTION_FORMAT.DAYS:
                /* `day(s)` || `# day(s)` */
                return mega.icu.format(l.plural_day, timeRange);
            case RETENTION_FORMAT.WEEKS:
                /* `week(s)` || `# week(s)` */
                return mega.icu.format(l.plural_week, timeRange);
            case RETENTION_FORMAT.MONTHS:
                /* `month(s)` || `# month(s)` */
                return mega.icu.format(l.plural_month, timeRange);
        }
    }

    handleRadioChange = e => {
        const selectedTimeFormat = e.target.value;
        this.setState(prevState => ({
            selectedTimeFormat,
            timeRange: this.filterTimeRange(prevState.timeRange, selectedTimeFormat)
        }));
    };

    filterTimeRange(timeRange, selectedTimeFormat) {
        // Values allowed -- integers, <= 2 characters, e.g.: 13 hours, 28 days, 4 weeks, 12 months
        if (timeRange.length > LIMIT.CHARS) {
            return timeRange.substring(0, LIMIT.CHARS);
        }
        timeRange = parseInt(timeRange, 10);
        if (timeRange === 0 || isNaN(timeRange)) {
            return '';
        }
        return Math.min(this.getMaxTimeRange(selectedTimeFormat), timeRange);
    }

    handleOnTimeCheck = e => {

        // Firefox fix bug on allowing strings on input type number applies to Webkit also
        const checkingValue = e.type === 'paste' ? e.clipboardData.getData('text') : e.key;
        if (e.keyCode !== 8 && isNaN(checkingValue)) {
            e.preventDefault();
        }
    };

    handleOnTimeChange = e => {
        const timeValue = e.target.value;
        this.setState(prevState => ({
            timeRange: this.filterTimeRange(timeValue, prevState.selectedTimeFormat)
        }));
    };

    handleOnSubmit(e) {
        if (!this.hasInput()) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();

        const { chatRoom, onClose } = this.props;
        const { selectedTimeFormat, timeRange } = this.state;
        let time = 0;
        switch (selectedTimeFormat) {
            case RETENTION_FORMAT.HOURS:
                time = hoursToSeconds(Number(timeRange));
                break;
            case RETENTION_FORMAT.DAYS:
                time = daysToSeconds(Number(timeRange));
                break;
            case RETENTION_FORMAT.WEEKS:
                time = daysToSeconds(Number(timeRange) * 7);
                break;
            case RETENTION_FORMAT.MONTHS:
                time = daysToSeconds(Number(timeRange) * 30);
                break;
        }

        chatRoom.setRetention(time);
        onClose();
    }

    renderCustomRadioButton() {
        return [
            RETENTION_FORMAT.HOURS,
            RETENTION_FORMAT.DAYS,
            RETENTION_FORMAT.WEEKS,
            RETENTION_FORMAT.MONTHS,
        ].map(label => {
            return (
                <CustomRadioButton
                    checked={this.state.selectedTimeFormat === label}
                    label={this.getParsedLabel(label, this.state.timeRange)}
                    name="time-selector"
                    value={label}
                    onChange={this.handleRadioChange}
                    key={label}
                />
            );
        });
    }

    componentDidMount() {
        M.safeShowDialog(this.dialogName, () => {
            $(document.body).rebind('keydown.historyRetentionDialog', e => {
                const key = e.keyCode || e.which;
                if (key === 13) {
                    this.handleOnSubmit(e);
                }
            });
        });
    }

    componentWillUnmount() {
        $(document.body).off('keydown.historyRetentionDialog');
        if ($.dialog === this.dialogName) {
            closeDialog();
        }
    }

    render() {
        const { chatRoom, onClose } = this.props;
        const { selectedTimeFormat, timeRange } = this.state;
        return (
            <ModalDialogsUI.ModalDialog
                {...this.state}
                chatRoom={chatRoom}
                onClose={onClose}
                dialogName={this.dialogName}
                dialogType="tool"
                onClick={() => this.inputRef.current.focus()}>

                <header>
                    <h2 id="msg-retention-dialog-title">{l[23434] /* `Schedule History Clearing` */}</h2>
                </header>

                <section className="content">
                    <div className="content-block">
                        <p>{l[23435] /* `Automatically delete messages older than:` */}</p>
                    </div>
                    <div className="content-block form">
                        <div className="form-section">
                            <span className="form-section-placeholder">
                                {this.getParsedLabel(selectedTimeFormat, timeRange)}
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                max={this.getMaxTimeRange(selectedTimeFormat)}
                                className="form-section-time"
                                placeholder={this.getMaxTimeRange(selectedTimeFormat)}
                                ref={this.inputRef}
                                autoFocus={true}
                                value={timeRange}
                                onChange={this.handleOnTimeChange}
                                onKeyPress={this.handleOnTimeCheck}
                                onPaste={this.handleOnTimeCheck}
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
                            onClick={onClose}>
                            <span>{l[82] /* `Cancel` */}</span>
                        </button>
                        <button
                            className={`
                                mega-button positive
                                ${this.hasInput() ? '' : 'disabled'}
                            `}
                            onClick={e => this.handleOnSubmit(e)}>
                            <span>{l[726] /* `Done` */}</span>
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
