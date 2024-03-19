/**
 * Gets the sprite name for current webClient.
 *
 * @return {String} Sprite name
 */
lazy(mega.ui, 'sprites', () => {
    'use strict';

    const res = Object.create(null);

    res.mono = `sprite-${is_mobile ? 'mobile-' : ''}fm-mono`;
    res.theme = `sprite-${is_mobile ? 'mobile-' : ''}fm-theme`;
    res.uni = `sprite-${is_mobile ? 'mobile-' : ''}fm-uni`;

    return freeze(res);
});
