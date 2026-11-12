/**
 * @fileOverview
 * NodeNameControl unit tests.
 */

describe('NodeNameControl Unit Test', () => {
    'use strict';

    const {expect} = chai;
    let typeInfo;
    let realM;

    beforeEach(() => {
        // M is a sealed proxy, swap it for one that shows dialogs synchronously
        realM = window.M;
        window.M = {safeShowDialog: (name, dispatcher) => dispatcher()};

        typeInfo = NodeNameControl.typeInfo;
        NodeNameControl.typeInfo = {
            rename: {name: 'rename-test', placeholder: '', button: '', title: () => ''}
        };

        mStub(mega.ui, 'sheet', {
            actionsNode: document.createElement('div'),
            footerNode: document.createElement('div'),
            clear: nop,
            addTitle: nop,
            addContent: nop,
            addFooter: nop,
            addClass: nop,
            show: nop,
            hide: nop
        });
        mStub(window, 'MegaButton', class {
            constructor({disabled}) {
                this.domNode = document.createElement('button');
                this.disabled = disabled;
            }

            addClass() {
                return this;
            }

            on() {
                return this;
            }
        });
    });

    afterEach(() => {
        window.M = realM;
        NodeNameControl.typeInfo = typeInfo;
        mStub.restore();
    });

    it('does not run the previous show() callbacks when shown again', () => {
        const control = new NodeNameControl({type: 'rename'});
        const first = sinon.spy(() => true);
        const second = sinon.spy(() => true);

        control.show({name: 'first', t: 1}, {canSubmit: first});
        expect(first.calledWith('first')).to.eql(true);
        first.resetHistory();

        control.show({name: 'second', t: 1}, {canSubmit: second});
        expect(first.callCount).to.eql(0);
        expect(second.calledWith('second')).to.eql(true);

        // The current show's handler is still bound
        second.resetHistory();
        control.nameInput.$input.val('third').trigger('input');
        expect(first.callCount).to.eql(0);
        expect(second.calledWith('third')).to.eql(true);
    });
});
