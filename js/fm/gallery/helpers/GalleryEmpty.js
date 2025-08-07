class GalleryEmpty extends MEmptyPad {
    constructor(parent) {
        super(parent);
        this.setContents();
    }

    setContents() {
        this.el.classList.add('hidden');

        const title = mCreateElement('div', { class: 'pt-6 font-title-h2-bold text-color-high' });
        title.textContent = l.empty_media_title;

        const hint = mCreateElement('div', { class: 'py-6 text-color-medium' });
        hint.textContent = l.empty_media_hint;

        const linksBlock = mCreateElement(
            'div',
            { class: 'items-center' }
        );

        let imgSrc = 'no-media.webp';

        accountUI.hasMobileSessions().then((status) => {
            if (!status) {
                imgSrc = 'no-media-no-app.webp';
                title.textContent = l.empty_media_no_app_title;
                hint.textContent = l.empty_media_no_app_hint;

                const links = [
                    'https://itunes.apple.com/app/mega/id706857885',
                    'https://play.google.com/store/apps/details?id=mega.privacy.android.app&referrer=meganzmobileapps'
                ];

                const events = [500920, 500919];

                linksBlock.appendChild(mCreateElement(
                    'div',
                    { class: 'flex flex-row justify-center items-center' },
                    [
                        mCreateElement(
                            'a',
                            { href: links[0], target: '_blank' },
                            [
                                mCreateElement(
                                    'img',
                                    { src: `${staticpath}images/mega/locale/${lang}_appstore.svg`, class: 'h-12' }
                                ),
                            ]
                        ),
                        mCreateElement(
                            'a',
                            {
                                href: links[1],
                                target: '_blank'
                            },
                            [
                                mCreateElement(
                                    'img',
                                    { src: `${staticpath}images/mega/locale/${lang}_playstore.png`, class: 'h-18 px-2' }
                                ),
                            ]
                        ),
                        mCreateElement('img', { src: `${staticpath}images/mega/go-qr.png`, class: 'h-20' })
                    ]
                ));

                const a = linksBlock.querySelectorAll(':scope > .flex > a');

                for (let i = a.length; i--;) {
                    a[i].addEventListener('click', () => {
                        eventlog(events[i]);
                        window.open(links[i], '_blank', 'noopener,noreferrer');
                    });
                }
            }

            this.el.append(mCreateElement(
                'div',
                { class: 'flex flex-column' },
                [
                    mCreateElement('div', null, [
                        mCreateElement('img', { src: `${staticpath}images/mega/empty/${imgSrc}`, class: 'h-48' }),
                    ]),
                    title,
                    hint,
                    linksBlock
                ]
            ));

            $(this.el).fadeIn();
            this.el.classList.remove('hidden');
        });
    }
}
