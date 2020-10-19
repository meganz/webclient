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
        index: '1.1',
        category: 'Dropdowns',
        title: 'DropdownContactsSelector',
        description: 'Use `<DropdownContactsSelector/>` to show a searchable list of contact in a dropdown.',
        code: `
        <Button
            className="link-button dropdown-element"
            icon="rounded-grey-plus"
            label="Add participant…"
            contacts={sampleData.contacts.singleContact}
            >
            <DropdownContactsSelector
                contacts={sampleData.contacts.singleContact}
                megaChat={sampleData.megaChat.dummy}
                className="popup add-participant-selector"
                onClick={function() { consol.error("Clicked!"); }}
                />
        </Button>
`
    }


    render () {
        return (
            <div style={{
                    textAlign: "center"
                }}>
                <Button
                    className="link-button dropdown-element"
                    icon="rounded-grey-plus"
                    label="Add participant…"
                    contacts={sampleData.contacts.singleContact}
                    >
                    <DropdownContactsSelector
                        contacts={sampleData.contacts.singleContact}
                        megaChat={sampleData.megaChat.dummy}
                        className="popup add-participant-selector"
                        onClick={() => { console.error("Clicked!"); }}
                        />
                </Button>
            </div>
        )
    }
}
