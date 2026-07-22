import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { isLoggedIn } from '../../utils/loginSession'
import './index.css'

export default function Index() {
  useLoad(() => {
    console.log('Page loaded.')
    console.log('session', isLoggedIn())
  })

  return (
    <View className='index'>
      <Text>Hello, Taro + React!</Text>
    </View>
  )
}
