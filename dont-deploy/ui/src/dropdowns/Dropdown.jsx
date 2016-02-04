import React, { Component } from 'react'

import {
    Dropdown,
    DropdownItem,
    DropdownContactsSelector
} from '../../../../js/ui/dropdowns.jsx'
import {
    Button,
} from '../../../../js/ui/buttons.jsx'

export default class extends Component {
    static styleguide = {
        index: '1.0',
        category: 'Dropdowns',
        title: 'Dropdowns and DropdownItems',
        description: 'TBD `<Dropdown/>` ....',
        code: `
        <div className="contacts-info">
            <Button
                className="default-white-button"
                icon="tiny-icon grey-down-arrow"
                label="Some label"
                style={{
                    width: 200
                }}>
                <Dropdown  className="message-dropdown" onClick={function() {}}>
                    <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                    <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                    <hr />
                    <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                </Dropdown>
            </Button>
            <Button className="default-white-button tiny-button" icon="tiny-icon grey-down-arrow">
                <Dropdown onClick={function() {}}>
                    <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                    <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                    <hr />
                    <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                </Dropdown>
            </Button>
            <br/>
            A Disabled button with dropdown:
            <Button
                className="default-white-button"
                icon="tiny-icon grey-down-arrow"
                label="Some label (this is disabled)"
                disabled={true}
                style={{
                    width: 200
                }}>
                <Dropdown  onClick={function() {}}>
                    <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                    <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                    <hr />
                    <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                </Dropdown>
            </Button>
        </div>
`
    }


    render () {
        return (
            <div className="contacts-info">
                <Button className="default-white-button tiny-button" icon="tiny-icon grey-down-arrow">
                    <Dropdown  className="message-dropdown" onClick={function() {}}>
                        <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                        <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                        <hr />
                        <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                    </Dropdown>
                </Button>
                <Button
                    className="default-white-button"
                    icon="tiny-icon grey-down-arrow"
                    label="Some label"
                    style={{
                    width: 200
                }}>
                    <Dropdown onClick={function() {}}>
                        <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                        <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                        <hr />
                        <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                    </Dropdown>
                </Button>

                <br/>
                A Disabled button with dropdown:
                <Button
                    className="default-white-button"
                    icon="tiny-icon grey-down-arrow"
                    label="Some label (this is disabled)"
                    disabled={true}
                    style={{
                    width: 200
                }}>
                    <Dropdown onClick={function() {}}>
                        <DropdownItem icon="writing-pen" label="Edit" onClick={function() {}}/>
                        <DropdownItem icon="quotes" label="Quote" onClick={function() {}} />
                        <hr />
                        <DropdownItem icon="red-cross" label="Delete" className="red" onClick={function() {}} />
                    </Dropdown>
                </Button>

            </div>
        )
    }
}
