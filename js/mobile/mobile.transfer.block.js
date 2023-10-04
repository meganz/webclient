class MegaMobileTransferBlock extends MegaMobileComponent {

    constructor(options) {
        super(options);

        if (options) {
            if (!options.transfer) {
                console.error('Transfer is missing in the options');
                return;
            }
            if (!options.id) {
                console.error('ID is missing in the options');
                return;
            }
        }

        this.domNode.classList.add('mega-transfer-block');

        const {transfer, id, callbacks} = options;

        this.domNode.id = id;

        let targetNode = this.domNode;
        let subNode = document.createElement('div');
        subNode.classList = 'file-info';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('div');
        subNode.classList = 'file-name';
        subNode.textContent = transfer.name;
        targetNode.appendChild(subNode);

        subNode = document.createElement('div');
        subNode.classList = 'file-actions';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('div');
        subNode.classList = 'file-status';
        targetNode.appendChild(subNode);
        this.status = MegaMobileTransferBlock.stateStrings.QUEUED;

        this.cancelButton = new MegaMobileButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon cancel hidden',
            icon: 'sprite-mobile-fm-mono icon-x-thin-outline',
            iconSize: 24
        });
        this.cancelButton.on('tap.cancelTransfer', () => {
            if (callbacks && callbacks.cancel && typeof callbacks.cancel === 'function') {
                callbacks.cancel(transfer);
            }
        });

        this.resumeButton = new MegaMobileButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon resume hidden',
            icon: 'sprite-mobile-fm-mono icon-play-thin-solid',
            iconSize: 24
        });
        this.resumeButton.on('tap.resumeTransfer', () => {
            this.manualPause = false;
            this.resumeTransfer();
        });

        this.pauseButton = new MegaMobileButton({
            parentNode: targetNode,
            type: 'icon',
            componentClassname: 'text-icon pause',
            icon: 'sprite-mobile-fm-mono icon-pause-thin-solid',
            iconSize: 24
        });
        this.pauseButton.on('tap.pauseTransfer', () => {
            this.manualPause = true;
            this.pauseTransfer();
        });

        targetNode = this.domNode;
        subNode = document.createElement('a');
        subNode.classList = 'file-progress';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('div');
        subNode.classList = 'bar';
        subNode.style.width = '0%';
        targetNode.appendChild(subNode);

        targetNode = this.domNode;
        subNode = document.createElement('div');
        subNode.classList = 'file-error';
        targetNode.appendChild(subNode);

        targetNode = subNode;
        subNode = document.createElement('i');
        subNode.className = 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline';
        targetNode.appendChild(subNode);

        subNode = document.createElement('div');
        subNode.classList = 'file-error-text';
        targetNode.appendChild(subNode);
    }


    // Getters and Setters

    get status() {
        const status = this.domNode.querySelector('.file-status');
        return status && status.textContent;
    }

    set status(state) {
        const status = this.domNode.querySelector('.file-status');
        if (status) {
            status.textContent = state;
        }
    }

    get iconStatus() {
        const status = this.domNode.querySelector('.file-status');
        return status && status.querySelector('i');
    }

    set iconStatus(className) {
        const status = this.domNode.querySelector('.file-status');
        if (status) {
            const icon = document.createElement('i');
            icon.className = className;
            status.append(icon);
        }
    }

    get barWidth() {
        const bar = this.domNode.querySelector('.file-progress .bar');
        return bar && bar.style.width;
    }

    set barWidth(width) {
        const bar = this.domNode.querySelector('.file-progress .bar');
        if (bar) {
            bar.style.width = width;
        }
    }

    get error() {
        const error = this.domNode.querySelector('.file-error .file-error-text');
        return error && error.textContent;
    }

    set error(errorstr) {
        const error = this.domNode.querySelector('.file-error .file-error-text');
        if (error) {
            error.textContent = errorstr;
        }
    }


    // Main methods

    updateTransfer(percentComplete) {
        // Calculate the completed transfer percentage
        const percentCompleteRounded = Math.round(percentComplete);

        this.status = `${percentCompleteRounded}%`;
        this.barWidth = `${percentComplete}%`;
    }

    finishTransfer(skipfile, isUpload) {
        this.updateTransfer(100);

        if (isUpload) {
            this.status =
                skipfile ? MegaMobileTransferBlock.stateStrings.ARCHIVED : MegaMobileTransferBlock.stateStrings.DONE;
        }

        this.addClass('complete');

        // Hide action buttons
        this.updateTransferActions(false, false, false);
    }

    errorTransfer(errorstr) {
        this.iconStatus = 'sprite-mobile-fm-mono icon-alert-triangle-thin-outline';

        this.error = errorstr;

        this.addClass('error');

        // Hide action buttons
        this.updateTransferActions(false, false, false);
    }

    resetTransfer() {
        this.status = MegaMobileTransferBlock.stateStrings.QUEUED;
        this.error = '';
        this.removeClass('error');

        // Reset action buttons
        this.updateTransferActions(true, false, false);
    }

    pauseTransfer() {
        fm_tfspause(this.domNode.id);
        this.updateTransferActions(false, true, true);
    }

    resumeTransfer() {
        fm_tfsresume(this.domNode.id);
        this.updateTransferActions(true, false, false);
    }


    // Utils

    updateTransferActions(pause, resume, cancel) {
        if (pause) {
            this.pauseButton.show();
        }
        else {
            this.pauseButton.hide();
        }

        if (resume) {
            this.resumeButton.show();
        }
        else {
            this.resumeButton.hide();
        }

        if (cancel) {
            this.cancelButton.show();
        }
        else {
            this.cancelButton.hide();
        }
    }

}

lazy(MegaMobileTransferBlock, 'stateStrings', () => {
    'use strict';

    return {
        QUEUED : l[7227],
        DONE : l.upload_status_uploaded,
        ARCHIVED : l[1668]
    };
});
