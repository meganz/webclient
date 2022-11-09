/**
 * @fileOverview
 * Notifications unit tests.
 */

describe("MegaInput Dropdown Unit Test", function() {
    "use strict";

    it("can set value from jquery selector", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body'); // to make focus work
        createDropdown($dummyDropdownElement, {
            items: ['batman', 'test'],
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            }
        });

        const $dropdownHiddenInput = $('.hidden-input', $dummyDropdownElement);
        let counter = 0;
        $dummyDropdownElement.on('focus', '.hidden-input', 'focus', function () {
            counter++;
        });

        setDropdownValue(
            $dummyDropdownElement, 
            ($dropdownInput, $dropdownInputOptions) => {
                if (!$dropdownInput.length) {
                    return;
                }
                return $('[data-type="batman"]', $dropdownInput);
            }
        );

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('batman');

        const $selectedElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        expect(counter).to.eql(1);
        $dummyDropdownElement.remove();
        done();
    });

    it("can set value from value", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: ['batman', 'test'],
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            }
        });

        const $dropdownHiddenInput = $('.hidden-input', $dummyDropdownElement);
        let counter = 0;
        $dropdownHiddenInput.on('focus', function () {
            counter++;
        });

        setDropdownValue(
            $dummyDropdownElement,
            'batman'
        );

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('batman');

        const $selectedElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        expect(counter).to.eql(1);
        $dummyDropdownElement.remove();
        done();
    });

    it("can get value via data-value", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: {
                'bat':'batman',
                't':'test',
                'w':'waaa'
            },
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            }
        });

        const $dropdownHiddenInput = $('.hidden-input', $dummyDropdownElement);
        let counter = 0;
        $dropdownHiddenInput.on('focus', function () {
            counter++;
        });

        setDropdownValue(
            $dummyDropdownElement,
            'bat'
        );

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('batman');

        const $selectedElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        expect(counter).to.eql(1);

        const dropdownValue = getDropdownValue(
            $dummyDropdownElement
        );
        expect(dropdownValue).to.eql('bat');

        $dummyDropdownElement.remove();
        done();
    });

    it("can get value via data-type", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: [
                'batman',
                'test',
                'waaa'
            ],
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            }
        });

        const $dropdownHiddenInput = $('.hidden-input', $dummyDropdownElement);
        let counter = 0;
        $dropdownHiddenInput.on('focus', function () {
            counter++;
        });

        setDropdownValue(
            $dummyDropdownElement,
            'batman'
        );

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('batman');

        const $selectedElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        expect(counter).to.eql(1);

        const dropdownValue = getDropdownValue(
            $dummyDropdownElement,
            'type'
        );
        expect(dropdownValue).to.eql('batman');

        $dummyDropdownElement.remove();
        done();
    });


    it("can set value from createDropdown selected option index", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: ['batman', 'test'],
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            },
            selected: "0"
        });

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('batman');

        const $selectedElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        $dummyDropdownElement.remove();
        done();
    });

    it("can set value from object items createDropdown selected option callback", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: {
                'bat':'batman',
                't':'test'
            },
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            },
            selected: function($dropdownOptionItem, selectedValue) {
                return $dropdownOptionItem.is('[data-value="t"]');
            }
        });

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('test');

        const $selectedElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        $dummyDropdownElement.remove();

        done();
    });

    it("can set value from array items createDropdown selected option callback", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <span>Some Label</span>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        $dummyDropdownElement.appendTo('body');
        createDropdown($dummyDropdownElement, {
            items: [
                'batman',
                'test'
            ],
            postAction: ($dropdownItem, value, index, list) => {
                $dropdownItem.attr('data-type', value); // mock affiliate js
            },
            selected: function($dropdownOptionItem, selectedValue) {
                return selectedValue == 'test';
            }
        });

        const $dropdownSpanValueLabel = $('span:first', $dummyDropdownElement);
        expect($dropdownSpanValueLabel.text()).to.eql('test');

        const $selectedElement = $('[data-type="test"]', $dummyDropdownElement);
        expect($selectedElement.hasClass('active')).to.be.true;
        expect($selectedElement.attr('data-state')).to.eql('active');

        const $otherElement = $('[data-type="batman"]', $dummyDropdownElement);
        expect($otherElement.hasClass('active')).to.be.false;
        $dummyDropdownElement.remove();

        done();
    });

    it("can create span label after title", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-title">Some title</div>
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        createDropdown($dummyDropdownElement, {
            items: ['batman', 'test'],
            placeholder: 'test placeholder'
        });

        const $spanLabelElement = $('span:first', $dummyDropdownElement);

        expect($spanLabelElement.length).to.equal(1);
        expect($spanLabelElement.text()).to.equal('test placeholder');
        $dummyDropdownElement.remove();
        done()
    });

    it("can create span label with no title", function(done) {
        const dummyDropdown = `
            <div class="mega-input dropdown-input">
                <div class="mega-input-dropdown hidden">
                    <div class="dropdown-scroll"></div>
                </div>
                <input class="hidden-input">
            </div>
        `;

        const $dummyDropdownElement = $(dummyDropdown);
        createDropdown($dummyDropdownElement, {
            items: ['batman', 'test'],
            placeholder: 'test placeholder'
        });

        const $spanLabelElement = $('span:first', $dummyDropdownElement);

        expect($spanLabelElement.length).to.equal(1);
        expect($spanLabelElement.text()).to.equal('test placeholder');
        done()
    });
});
