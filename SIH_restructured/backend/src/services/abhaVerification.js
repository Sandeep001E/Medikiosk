// NHA ABHA ID Verification Mock Service for India

export function initiateAbhaVerification(abhaInput) {
  const cleanInput = abhaInput.trim();
  
  // Basic validation: 14 digits or @abha handle
  const is14Digit = /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(cleanInput) || /^\d{14}$/.test(cleanInput);
  const isAbhaHandle = /^[a-zA-Z0-9._-]+@abha$/.test(cleanInput);

  if (!is14Digit && !isAbhaHandle) {
    return {
      success: false,
      message: 'Invalid ABHA format. Please enter a 14-digit ABHA number (e.g. 12-3456-7890-1234) or a valid @abha handle.'
    };
  }

  // Generate a mock 6-digit OTP
  const mockOtp = '123456'; // Default demo OTP

  return {
    success: true,
    txnId: 'TXN-' + Math.floor(10000000 + Math.random() * 90000000),
    abhaId: is14Digit && !cleanInput.includes('-') 
      ? cleanInput.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4') 
      : cleanInput,
    maskedMobile: '+91 ******3210',
    mockOtpMessage: 'Verification OTP sent to registered mobile number (+91 ******3210). (Demo OTP: 123456)'
  };
}

export function confirmAbhaOtp(txnId, otp, abhaId) {
  if (otp !== '123456' && otp !== '654321') {
    return {
      success: false,
      message: 'Incorrect OTP. Please enter the verification OTP (123456).'
    };
  }

  const cleanId = abhaId || '14-1234-5678-9012';
  const rawHandle = cleanId.includes('@') ? cleanId.split('@')[0] : `user.${cleanId.replace(/-/g, '').slice(-4)}`;

  // Return verified patient demographics from NHA registry
  return {
    success: true,
    verified: true,
    patientProfile: {
      abhaId: cleanId,
      abhaAddress: `${rawHandle}@abha`,
      fullName: 'Ayushman Beneficiary',
      dob: '1992-05-15',
      gender: 'Not Specified',
      bloodGroup: 'B+',
      phone: '+91 98000 12345',
      address: 'Bengaluru, Karnataka',
      verifiedAt: new Date().toISOString()
    }
  };
}
