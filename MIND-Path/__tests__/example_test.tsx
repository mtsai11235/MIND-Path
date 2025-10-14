import { render } from '@testing-library/react-native';

import Example, { CustomText } from '@/app/example';

describe('<Example />', () => {
  test('Text renders correctly on Example Page', () => {
    const { getByText } = render(<Example />);

    getByText('Welcome!');
  });

  test('CustomText renders correctly', () => {
    const tree = render(<CustomText>Some text</CustomText>).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
