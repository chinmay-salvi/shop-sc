// Proves that the last 8 bytes of the email equal "@usc.edu" (ASCII).
// Private input: emailSuffix[8] — the 8 bytes. Circuit constrains they equal 64,117,115,99,46,101,100,117.
pragma circom 2.0.0;

template EmailSuffixUsc() {
  signal input emailSuffix[8];
  // @usc.edu in ASCII: @ u s c . e d u
  emailSuffix[0] === 64;
  emailSuffix[1] === 117;
  emailSuffix[2] === 115;
  emailSuffix[3] === 99;
  emailSuffix[4] === 46;
  emailSuffix[5] === 101;
  emailSuffix[6] === 100;
  emailSuffix[7] === 117;
}
