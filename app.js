const express = require('express');
const axios = require('axios').default;
const { Translate } = require('@google-cloud/translate').v2;
const imageSearch = require('image-search-google');

const client = new imageSearch(process.env.SEARCH_CSN, process.env.API_KEY);

const app = express();

const translate = new Translate();

const createTranslationChain = (text, REPEAT = 10) => {
    let t = text;
    let local = null;
    return async () => {
        const res = [];
        for (let i = 0; i < REPEAT; i++) {
            if (i === REPEAT - 1) {
                local = 'ru';
            } else {
                const locales = await translate
                    .getLanguages()
                    .then((data) =>
                        data[1].data.languages.map((el) => el.language)
                    );
                const i = Math.floor(Math.random() * (locales.length - 1));
                local = locales[i];
            }

            const { translatedText, detectedSourceLanguage } = await translate
                .translate(t, local)
                .then((data) => data[1].data.translations[0]);

            t = translatedText;
            res.push({
                text: translatedText,
                language: detectedSourceLanguage,
            });
        }
        return res;
    };
};

const getList = async (word, count = 10) => {
    const chain = createTranslationChain(word, count);
    const translations = await chain();
    const imageList = await Promise.all(
        translations.map(async (el) => {
            const response = await client
                .search(el.text)
                .then((data) => data[0]);
            return { url: response.url, text: el.text, language: el.language };
        })
    );
    return imageList;
};

app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    const list = await getList(req.query.q, req.query.count);
    res.render('index', { list });
});

app.listen(process.env.PORT || 8080, () => {
    console.log(`Listening ${3004}`);
});
