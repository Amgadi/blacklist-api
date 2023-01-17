const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const _  = require('lodash');
const app = express();
const port = 3000;
const { db } = require('./firebase-config');
const { collection, query, where, getDocs, doc, updateDoc, arrayUnion, addDoc } = require('firebase/firestore');
const { list } = require('./sites');

app.use(cors());

// Configuring body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


getSiteReports = async (url) => {
    const q = query(collection(db, "blacklist"), where("full_url", "==", url));
    const querySnapshot = await getDocs(q);
    let document = {};
    querySnapshot.forEach((doc) => {
        document = {...doc.data(), id: doc.id};
    });
    return document;
}

addSiteReports = async (url, ip) => {
    await addDoc(collection(db, "blacklist"), {
        full_url: url,
        reported_by: [ip],
    });
}

updateSiteReports = async (ref, url, ip) => {
    await updateDoc(ref, {
        reported_by: arrayUnion(ip)
    });
};

app.get('/url_info', async (req, res) => {
    const { url, ip } = req.query;
    const data = await getSiteReports(url);
    res.json({
        reportsCount: data.reported_by.length,
        isUserReported: data.reported_by.includes(ip),
    });
});

app.post('/report', async (req, res) => {
    const { url, ip } = req.body;
    const data = await getSiteReports(url);
    try {
        if (!_.isEmpty(data)) {
            const siteRef = doc(db, "blacklist", data.id);
            await updateSiteReports(siteRef, url, ip);
            res.json({result: 'success'});
        } else {
            await addSiteReports(url, ip);
            res.json({result: 'success'});
        }
    } catch (e) {
        console.error(e);
        res.json({result: 'error'});
    }
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));
