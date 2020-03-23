var React = require("react");
var utils = require("./utils.jsx");
import {MegaRenderMixin} from "../stores/mixins.js";
var DropdownsUI = require('./dropdowns.jsx');
var PerfectScrollbar = require('./perfectScrollbar.jsx').PerfectScrollbar;

export class DropdownEmojiSelector extends MegaRenderMixin {

    static defaultProps = {
        'requiresUpdateOnResize': true,
        'hideable': true
    };

    constructor(props) {
        super(props);

        this.data_categories = null;
        this.data_emojis = null;
        this.data_emojiByCategory = null;
        this.customCategoriesOrder = [
            "frequently_used",
            "people",
            "nature",
            "food",
            "activity",
            "travel",
            "objects",
            "symbols",
            "flags"
        ];
        this.frequentlyUsedEmojis = [
            'slight_smile',
            'grinning',
            'smile',
            'wink',
            'yum',
            'rolling_eyes',
            'stuck_out_tongue',
        ];
        this.heightDefs = {
            'categoryTitleHeight': 55,
            'emojiRowHeight': 35,
            'containerHeight': 302,
            'totalScrollHeight': 302,
            'numberOfEmojisPerRow': 9
        };
        /*
         "PEOPLE": l[8016],
         "NATURE": l[8017],
         "FOOD & DRINK": l[8018],
         "CELEBRATION": l[8019],
         "ACTIVITY": l[8020],
         "TRAVEL & PLACES": l[8021],
         "OBJECTS & SYMBOLS": l[8022]
         */
        this.categoryLabels = {
            'frequently_used': l[17737],
            'people': l[8016],
            'objects': l[17735],
            'activity': l[8020],
            'nature': l[8017],
            'travel': l[8021],
            'symbols': l[17736],
            'food': l[8018],
            'flags': l[17703]
        };

        this.state = this.getInitialState();
        this.onSearchChange = this.onSearchChange.bind(this);
        this.onUserScroll = this.onUserScroll.bind(this);
        this._onScrollChanged = this._onScrollChanged.bind(this);
    }
    getInitialState() {
        return clone({
            'previewEmoji': null,
            'searchValue': '',
            'browsingCategory': false,
            'isActive': false,
            'isLoading': true,
            'loadFailed': false,
            'visibleCategories': "0"
        })
    }
    _generateEmoji(meta) {
        var filename = twemoji.convert.toCodePoint(meta.u);

        return <img
            width="20"
            height="20"
            className="emoji emoji-loading"
            draggable="false"
            alt={meta.u}
            title={":" + meta.n + ":"}
            onLoad={(e) => {
                e.target.classList.remove('emoji-loading');
            }}
            onError={(e) => {
                e.target.classList.remove('emoji-loading');
                e.target.classList.add('emoji-loading-error');
            }}
            src={
                staticpath +
                "images/mega/twemojis/2_v2/72x72/" +
                filename + ".png"
            }
        />;
    }
    _generateEmojiElement(emoji, cat) {
        var self = this;

        var categoryName = self.data_categories[cat];

        return <div
            data-emoji={emoji.n}
            className="button square-button emoji" key={categoryName + "_" + emoji.n}
            onMouseEnter={(e) => {
                if (self.mouseEnterTimer) {
                    clearTimeout(self.mouseEnterTimer);
                }

                e.stopPropagation();
                e.preventDefault();

                // delay the .setState change, because of the tons of icons we've, which are
                // re-rendered in case of .setState
                self.mouseEnterTimer = setTimeout(function() {
                    self.setState({'previewEmoji': emoji});
                }, 250);
            }}
            onMouseLeave={(e) => {
                if (self.mouseEnterTimer) {
                    clearTimeout(self.mouseEnterTimer);
                }
                e.stopPropagation();
                e.preventDefault();

                self.setState({'previewEmoji': null});
            }}
            onClick={(e) => {
                if (self.props.onClick) {
                    self.props.onClick(e, emoji.n, emoji);
                }
            }}
        >
            {self._generateEmoji(emoji)}
        </div>;
    }
    componentWillUpdate(nextProps, nextState) {
        if (
            nextState.searchValue !== this.state.searchValue ||
            nextState.browsingCategories !== this.state.browsingCategories
        ) {
            this._cachedNodes = {};
            if (this.scrollableArea) {
                this.scrollableArea.scrollToY(0);
            }
            this._onScrollChanged(0, nextState);
        }

        if (nextState.isActive === true) {
            var self = this;
            if (
                nextState.isLoading === true ||
                (!self.loadingPromise && (!self.data_categories || !self.data_emojis))
            ) {
                self.loadingPromise = MegaPromise.allDone([
                    megaChat.getEmojiDataSet('categories')
                        .done(function (categories) {
                            self.data_categories = categories;
                        }),
                    megaChat.getEmojiDataSet('emojis')
                        .done(function (emojis) {
                            self.data_emojis = emojis;
                        })
                ])
                    .done(function (results) {
                        if (
                            (!results[0] || results[0][1] && results[0][1] === "error") ||
                            (!results[1] || results[1][1] && results[1][1] === "error")
                        ) {
                            if (d) {
                                console.error("Emoji loading failed.", results);
                            }
                            self.setState({'loadFailed': true, 'isLoading': false});
                            return;
                        }

                        // custom categories order
                        self.data_categories.push('frequently_used');
                        self.data_categoriesWithCustomOrder = [];
                        self.customCategoriesOrder.forEach(function(catName) {
                            self.data_categoriesWithCustomOrder.push(
                                self.data_categories.indexOf(catName)
                            );
                        });

                        self.data_emojiByCategory = {};

                        var frequentlyUsedEmojisMeta = {};
                        self.data_emojis.forEach(function(emoji) {
                            var cat = emoji.c;
                            if (!self.data_emojiByCategory[cat]) {
                                self.data_emojiByCategory[cat] = [];
                            }
                            if (self.frequentlyUsedEmojis.indexOf(emoji.n) > -1) {
                                frequentlyUsedEmojisMeta[emoji.n] = emoji.u;
                            }

                            emoji.element = self._generateEmojiElement(emoji, cat);

                            self.data_emojiByCategory[cat].push(
                                emoji
                            );
                        });


                        self.data_emojiByCategory[8] = [];

                        self.frequentlyUsedEmojis.forEach(function(slug) {
                            var emoji = {
                                'n': slug,
                                'u': frequentlyUsedEmojisMeta[slug]
                            };

                            emoji.element = self._generateEmojiElement(emoji, 99);
                            self.data_emojiByCategory[8].push(
                                emoji
                            );
                        });

                        self._onScrollChanged(0);

                        self.setState({'isLoading': false});
                    });
            }
        }
        else if (nextState.isActive === false) {
            var self = this;

            if (self.data_emojis) {
                // cleanup cached React/DOM elements from the emoji set
                self.data_emojis.forEach(function (emoji) {
                    delete emoji.element;
                });
            }
            self.data_emojis = null;
            self.data_categories = null;
            self.data_emojiByCategory = null;
            self.loadingPromise = null;
        }
    }
    onSearchChange(e) {
        var self = this;
        self.setState({
            searchValue: e.target.value,
            browsingCategory: false
        });
    }
    onUserScroll(
        $ps,
        elem,
        e
    ) {
        if (this.state.browsingCategory) {
            var $cat = $('.emoji-category-container[data-category-name="' + this.state.browsingCategory + '"]');
            if (!elementInViewport($cat)) {
                this.setState({'browsingCategory': false});
            }
        }

        this._onScrollChanged($ps.getScrollPositionY());
    }
    generateEmojiElementsByCategory(categoryId, posTop, stateObj) {
        var self = this;

        if (!self._cachedNodes) {
            self._cachedNodes = {};
        }
        if (!stateObj) {
            stateObj = self.state;
        }

        if (typeof self._cachedNodes[categoryId] !== 'undefined') {
            return self._cachedNodes[categoryId];
        }

        var categoryName = self.data_categories[categoryId];
        var emojis = [];
        var searchValue = stateObj.searchValue;

        var totalEmojis = 0;
        self.data_emojiByCategory[categoryId].forEach(function (meta) {
            var slug = meta.n;
            if (searchValue.length > 0) {
                if ((":" + slug + ":").toLowerCase().indexOf(searchValue.toLowerCase()) < 0) {
                    return;
                }
            }

            totalEmojis++;

            emojis.push(
                meta.element
            );
        });


        if (emojis.length > 0) {
            var totalHeight = self.heightDefs.categoryTitleHeight + Math.ceil(
                    (totalEmojis / self.heightDefs.numberOfEmojisPerRow)
                ) * self.heightDefs.emojiRowHeight;

            return self._cachedNodes[categoryId] = [
                totalHeight,
                <div
                    key={categoryName}
                    data-category-name={categoryName} className="emoji-category-container"
                    style={{
                        'position': 'absolute',
                        'top': posTop
                    }}
                    >
                    {emojis.length > 0 ? <div className="clear"></div> : null}
                    <div className="emoji-type-txt">
                        {
                            self.categoryLabels[categoryName] ?
                                self.categoryLabels[categoryName] :
                                categoryName
                        }
                    </div>

                    <div className="clear"></div>
                    {emojis}
                    <div className="clear"></div>
                </div>
            ];
        }
        else {
            return self._cachedNodes[categoryId] = undefined;
        }
    }
    _isVisible(scrollTop, scrollBottom, elTop, elBottom) {
        var visibleTop = elTop < scrollTop ? scrollTop : elTop;
        var visibleBottom = elBottom > scrollBottom ? scrollBottom : elBottom;
        var visibleHeight = visibleBottom - visibleTop;

        return visibleBottom - visibleTop > 0;
    }
    _onScrollChanged(scrollPositionY, stateObj) {
        var self = this;

        if (!self.data_categoriesWithCustomOrder) {
            return;
        }

        if (scrollPositionY === false) {
            scrollPositionY = self.scrollableArea.getScrollPositionY();
        }
        if (!stateObj) {
            stateObj = self.state;
        }

        var emojis = [];
        var searchValue = stateObj.searchValue;

        var visibleStart = scrollPositionY;
        var visibleEnd = visibleStart + self.heightDefs.containerHeight;

        var currentPos = 0;
        var visibleCategories = [];
        self._emojiReactElements = [];
        self.data_categoryPositions = {};

        self.data_categoriesWithCustomOrder.forEach(function (k) {
            var categoryDivMeta = self.generateEmojiElementsByCategory(k, currentPos, stateObj);
            if (categoryDivMeta) {
                var startPos = currentPos;
                currentPos += categoryDivMeta[0];
                var endPos = currentPos;

                self.data_categoryPositions[k] = startPos;

                if (
                    self._isVisible(
                        visibleStart,
                        visibleEnd,
                        startPos,
                        endPos
                    )
                ) {
                    visibleCategories.push(k);
                    self._emojiReactElements.push(categoryDivMeta[1]);
                }
            }
        });

        if (self._emojiReactElements.length === 0) {
            const emojisNotFound = (
                <span className="emojis-not-found" key={'emojis-not-found'}>
                    {l[20920]}
                </span>
            );
            self._emojiReactElements.push(emojisNotFound);
        }

        visibleCategories = visibleCategories.join(',');

        self.setState({
            'totalScrollHeight': currentPos,
            'visibleCategories': visibleCategories
        });
    }
    _renderEmojiPickerPopup() {
        var self = this;

        var preview;
        if (self.state.previewEmoji) {
            var meta = self.state.previewEmoji;
            var slug = meta.n;
            var txt = ":" + slug + ":";
            if (slug.substr(0, 1) == ":" || slug.substr(-1) == ":") {
                txt = slug;
            }


            preview = <div className="emoji-preview">
                {self._generateEmoji(meta)}
                <div className="emoji title">{":" + meta.n + ":"}</div>
            </div>;
        }

        var categoryIcons = {
            "frequently_used": "clock-icon",
            "people": "smile-icon",
            "nature": "leaf-icon",
            "food": "cutlery-icon",
            "activity": "ball-icon",
            "travel": "car-icon",
            "objects": "bulb-icon",
            "symbols": "heart-icon",
            "flags": "flag-icon",
        };

        var categoryButtons = [];

        var activeCategoryName = false;
        if (!self.state.searchValue) {
            var firstActive = self.state.visibleCategories.split(",")[0];
            if (firstActive) {
                activeCategoryName = self.data_categories[firstActive];
            }
        }

        self.customCategoriesOrder.forEach(function (categoryName) {
            var activeClass = activeCategoryName === categoryName ? " active" : "";

            categoryButtons.push(
                <div
                    visiblecategories={self.state.visibleCategories}
                    className={"button square-button emoji" + (activeClass)}
                    key={categoryIcons[categoryName]}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        self.setState({browsingCategory: categoryName, searchValue: ''});
                        self._cachedNodes = {};


                        var categoryPosition = self.data_categoryPositions[
                                self.data_categories.indexOf(categoryName)
                            ] + 10;

                        self.scrollableArea.scrollToY(
                            categoryPosition
                        );

                        self._onScrollChanged(categoryPosition)
                    }}
                >
                    <i className={"small-icon " + categoryIcons[categoryName]}></i>
                </div>
            );
        });

        return <div>
            <div className="popup-header emoji">

                { preview ? preview : <div className="search-block emoji">
                        <i className="small-icon search-icon"></i>
                        <input type="search"
                               placeholder={__(l[102])}
                               ref="emojiSearchField"
                               onChange={this.onSearchChange}
                               value={this.state.searchValue}/>

                    </div>
                }

            </div>



            <PerfectScrollbar
                className="popup-scroll-area emoji perfectScrollbarContainer"
                searchValue={this.state.searchValue}
                onUserScroll={this.onUserScroll}
                visibleCategories={this.state.visibleCategories}
                ref={(ref) => {
                    self.scrollableArea = ref;
                }}
            >
                <div className="popup-scroll-content emoji">
                    <div style={{height: self.state.totalScrollHeight}}>
                        {self._emojiReactElements}
                    </div>
                </div>
            </PerfectScrollbar>

            <div className="popup-footer emoji">{categoryButtons}</div>
        </div>;
    }
    render() {
        var self = this;

        var popupContents = null;

        if (self.state.isActive === true) {
            if (self.state.loadFailed === true) {
                popupContents = <div className="loading">{l[1514]}</div>;
            }
            else if (self.state.isLoading === true && !self.data_emojiByCategory) {
                popupContents = <div className="loading">{l[5533]}</div>;
            }
            else {
                popupContents = self._renderEmojiPickerPopup();
            }
        }
        else {
            popupContents = null;
        }


        return <DropdownsUI.Dropdown
            className="popup emoji"
            {...self.props}
            ref="dropdown"
            isLoading={self.state.isLoading}
            loadFailed={self.state.loadFailed}
            visibleCategories={this.state.visibleCategories}
            forceShowWhenEmpty={true}
            onActiveChange={(newValue) => {
                // reset state if the dropdown is hidden
                if (newValue === false) {
                    self.setState(self.getInitialState());
                    self._cachedNodes = {};
                    self._onScrollChanged(0);
                }
                else {
                    self.setState({'isActive': true});
                }
            }}
            searchValue={self.state.searchValue}
            browsingCategory={self.state.browsingCategory}
            previewEmoji={self.state.previewEmoji}
        >
            {popupContents}
        </DropdownsUI.Dropdown>;
    }
};
