import { getSmpHtml } from './smp/smpHtml';
import { getSmpCss } from './smp/smpCss';
import { getSmpStoreJs } from './smp/smpStore';
import { getSmpAnnotationsJs } from './smp/smpAnnotations';
import { getSmpActivitiesJs } from './smp/smpActivities';
import { getSmpJs } from './smp/smpJs';

export const getSuperMediaPlayerHtml = (): string => {
    return getSmpHtml();
};

export const getSuperMediaPlayerCss = (): string => {
    return getSmpCss();
};

export const getSuperMediaPlayerJs = (): string => {
    return `
    (function() {
        'use strict';
        const $ = (id) => typeof id === 'string' ? document.getElementById(id) : id;

        ${getSmpStoreJs()}
        ${getSmpActivitiesJs()}
        ${getSmpAnnotationsJs()}
        ${getSmpJs()}
    })();
    `;
};

export const getSuperMediaPlayerContent = () => {
    return {
        html: getSuperMediaPlayerHtml(),
        css: getSuperMediaPlayerCss(),
        js: getSuperMediaPlayerJs()
    };
};
