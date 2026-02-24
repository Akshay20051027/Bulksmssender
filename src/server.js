const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const requiredEnv = ['KITE_USERNAME', 'KITE_API_KEY', 'KITE_SENDER_ID', 'KITE_TEMPLATE_ID'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`Warning: ${key} is not set. SMS requests will fail until it is configured.`);
  }
});

const societyName =
  process.env.SOCIETY_NAME || 'The Vignan Employees Mutually Aided Co-operative Thrift & Credit Society Ltd.';

// Formats message to match the updated DLT template with monthly deductions
function buildMessage({
  name,
  thriftBalance,
  loanBalance,
  suretySignatures,
  dividend = 0,
  monthlyThriftContribution,
  monthlyLoanRepayment,
  monthlyInterestAmount,
  totalMonthlyDeduction,
}) {
  return `Dear ${name}, Greetings from the official website of ${societyName}. This is to inform you that, as per the latest records available on the Society's website, your account details are as follows: Thrift Balance – ₹${thriftBalance}; Loan Balance – ₹${loanBalance}; Surety Signatures – ${suretySignatures}; Dividend – ₹${dividend}. Your monthly deduction details include Monthly Thrift Contribution – ₹${monthlyThriftContribution}, Monthly Loan Repayment – ₹${monthlyLoanRepayment}, Monthly Interest Amount – ₹${monthlyInterestAmount}, making the Total Monthly Deduction – ₹${totalMonthlyDeduction}. Kindly review the above information, and for any clarification or further assistance, please contact the Society Office. Thank you for your continued association with the Society.`;
}

async function sendKiteSms({ mobile, message }) {
  const url = 'http://bulk.kitesms.com/v3/api.php';

  const params = {
    username: process.env.KITE_USERNAME,
    apikey: process.env.KITE_API_KEY,
    senderid: process.env.KITE_SENDER_ID,
    templateid: process.env.KITE_TEMPLATE_ID,
    route: 'Transactional',
    mobile,
    message,
  };

  const response = await axios.get(url, { params });
  return response.data; // KiteSMS returns MessageID on success
}

app.post('/api/send-sms', async (req, res) => {
  try {
    const {
      name,
      mobile,
      thriftBalance,
      loanBalance,
      suretySignatures,
      dividend = 0,
      monthlyThriftContribution,
      monthlyLoanRepayment,
      monthlyInterestAmount,
      totalMonthlyDeduction,
    } = req.body;

    const requiredFields = [
      name,
      mobile,
      thriftBalance,
      loanBalance,
      suretySignatures,
      monthlyThriftContribution,
      monthlyLoanRepayment,
      monthlyInterestAmount,
      totalMonthlyDeduction,
    ];

    if (requiredFields.some((v) => v === undefined || v === null || v === '')) {
      return res.status(400).json({
        error:
          'name, mobile, thriftBalance, loanBalance, suretySignatures, monthlyThriftContribution, monthlyLoanRepayment, monthlyInterestAmount, and totalMonthlyDeduction are required',
      });
    }

    const message = buildMessage({
      name,
      thriftBalance,
      loanBalance,
      suretySignatures,
      dividend,
      monthlyThriftContribution,
      monthlyLoanRepayment,
      monthlyInterestAmount,
      totalMonthlyDeduction,
    });
    const messageId = await sendKiteSms({ mobile, message });

    // Save messageId into your persistence layer for traceability (omitted here)
    res.json({ messageId });
  } catch (error) {
    console.error('SMS Error:', error.message);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

app.listen(PORT, () => {
  console.log(`SMS server running on http://localhost:${PORT}`);
});
